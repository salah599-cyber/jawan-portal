import { db } from "@/lib/db";
import { startOfMonth } from "@/lib/calendar/date-ranges";
import { MARKET_CONFIG } from "@/lib/public-markets/constants";
import {
  backfillAssetValuations,
  getPerformanceBaselineAtDate,
} from "@/lib/portfolio/valuations";
import { assetEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";
import { convertToOmr, entityWhere } from "@/lib/reports/helpers";
import type { PublicMarket } from "@/lib/generated/prisma/client";

const COUNTABLE_ASSET_STATUSES = ["ACTIVE", "MONITOR"] as const;

export type AssetPerformer = {
  name: string;
  returnPct: number;
  href: string;
};

export type AssetPerformanceRow = {
  id: string;
  name: string;
  href: string;
  currentValueOmr: number;
  monthStartValueOmr: number;
  monthReturnPct: number | null;
};

export type PortfolioPerformance = {
  monthReturnOmr: number | null;
  monthReturnPct: number | null;
  ytdReturnOmr: number | null;
  ytdReturnPct: number | null;
  bestPerformer: AssetPerformer | null;
  worstPerformer: AssetPerformer | null;
  hasSufficientData: boolean;
  assetRows: AssetPerformanceRow[];
};

export type PortfolioPerformanceOptions = {
  entityId?: string;
};

type PerformanceAsset = {
  id: string;
  name: string;
  category: string;
  currentValue: { toString(): string } | null;
  currency: string;
  ownershipPct: { toString(): string };
  acquisitionCost: { toString(): string } | null;
  acquisitionDate: Date | null;
};

function weightedValue(
  amount: { toString(): string } | null | undefined,
  ownershipPct: { toString(): string },
): number {
  if (!amount) return 0;
  const value = parseFloat(amount.toString());
  const pct = parseFloat(ownershipPct.toString());
  if (Number.isNaN(value) || Number.isNaN(pct)) return 0;
  return (value * pct) / 100;
}

function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

function computePortfolioReturn(
  currentTotalOmr: number,
  baselineTotalOmr: number,
): { returnOmr: number; returnPct: number } | null {
  if (baselineTotalOmr <= 0) return null;
  const returnOmr = currentTotalOmr - baselineTotalOmr;
  return {
    returnOmr,
    returnPct: (returnOmr / baselineTotalOmr) * 100,
  };
}

function publicMarketHref(market: PublicMarket): string {
  return market === "MSX" ? "/portfolio/msx" : "/portfolio/public-markets";
}

async function getWeightedBaselineOmrAtDate(
  asset: PerformanceAsset,
  periodStart: Date,
): Promise<number> {
  const snapshot = await getPerformanceBaselineAtDate(asset, periodStart);
  if (!snapshot) return 0;

  const pct = parseFloat(asset.ownershipPct.toString());
  if (Number.isNaN(pct)) return 0;

  if (snapshot.currency === "OMR") {
    return (snapshot.value * pct) / 100;
  }

  const weighted = (snapshot.value * pct) / 100;
  if (weighted <= 0) return 0;
  return convertToOmr(weighted, snapshot.currency);
}

async function collectPublicEquityHoldingPerformers(
  publicEquityAssets: PerformanceAsset[],
  monthStart: Date,
): Promise<AssetPerformer[]> {
  if (publicEquityAssets.length === 0) return [];

  const holdings = await db.publicEquityHolding.findMany({
    where: { assetId: { in: publicEquityAssets.map((asset) => asset.id) } },
    select: {
      symbol: true,
      name: true,
      market: true,
      marketValue: true,
      currency: true,
      asset: {
        select: {
          id: true,
          ownershipPct: true,
        },
      },
    },
  });

  const parentBaselines = new Map(
    await Promise.all(
      publicEquityAssets.map(async (asset) => [
        asset.id,
        await getWeightedBaselineOmrAtDate(asset, monthStart),
      ] as const),
    ),
  );

  const parentCurrentTotals = new Map(
    await Promise.all(
      publicEquityAssets.map(async (asset) => [
        asset.id,
        await convertToOmr(weightedValue(asset.currentValue, asset.ownershipPct), asset.currency),
      ] as const),
    ),
  );

  const performers: AssetPerformer[] = [];

  for (const holding of holdings) {
    const marketValue = holding.marketValue ? parseFloat(holding.marketValue.toString()) : 0;
    if (Number.isNaN(marketValue) || marketValue <= 0) continue;

    const ownershipPct = parseFloat(holding.asset.ownershipPct.toString());
    if (Number.isNaN(ownershipPct)) continue;

    const currentOmr = await convertToOmr(
      (marketValue * ownershipPct) / 100,
      holding.currency,
    );
    if (currentOmr <= 0) continue;

    const parentCurrent = parentCurrentTotals.get(holding.asset.id) ?? 0;
    const parentBaseline = parentBaselines.get(holding.asset.id) ?? 0;

    let monthBaselineOmr = 0;
    if (parentCurrent > 0 && parentBaseline > 0) {
      monthBaselineOmr = (currentOmr / parentCurrent) * parentBaseline;
    }

    if (monthBaselineOmr <= 0) continue;

    const monthReturnPct = ((currentOmr - monthBaselineOmr) / monthBaselineOmr) * 100;
    const label = holding.name?.trim()
      ? `${holding.symbol} — ${holding.name}`
      : holding.symbol;
    const marketLabel = MARKET_CONFIG[holding.market]?.shortLabel ?? holding.market;

    performers.push({
      name: `${label} (${marketLabel})`,
      returnPct: monthReturnPct,
      href: publicMarketHref(holding.market),
    });
  }

  return performers;
}

export async function computePortfolioPerformance(
  ctx: UserContext,
  options: PortfolioPerformanceOptions = {},
): Promise<PortfolioPerformance> {
  const empty: PortfolioPerformance = {
    monthReturnOmr: null,
    monthReturnPct: null,
    ytdReturnOmr: null,
    ytdReturnPct: null,
    bestPerformer: null,
    worstPerformer: null,
    hasSufficientData: false,
    assetRows: [],
  };

  const assets = await db.asset.findMany({
    where: {
      ...entityWhere(options.entityId, assetEntityFilter(ctx)),
      status: { in: [...COUNTABLE_ASSET_STATUSES] },
    },
    select: {
      id: true,
      name: true,
      category: true,
      currentValue: true,
      currency: true,
      ownershipPct: true,
      acquisitionCost: true,
      acquisitionDate: true,
    },
  });

  if (assets.length === 0) return empty;

  const now = new Date();
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);

  let currentTotalOmr = 0;
  let monthBaselineTotalOmr = 0;
  let ytdBaselineTotalOmr = 0;

  const monthPerformers: AssetPerformer[] = [];
  const assetRows: AssetPerformanceRow[] = [];
  const publicEquityAssets: PerformanceAsset[] = [];

  for (const asset of assets) {
    const currentWeighted = weightedValue(asset.currentValue, asset.ownershipPct);
    if (currentWeighted <= 0) continue;

    const currentOmr = await convertToOmr(currentWeighted, asset.currency);
    const monthBaselineOmr = await getWeightedBaselineOmrAtDate(asset, monthStart);
    const ytdBaselineOmr = await getWeightedBaselineOmrAtDate(asset, yearStart);

    currentTotalOmr += currentOmr;
    monthBaselineTotalOmr += monthBaselineOmr;
    ytdBaselineTotalOmr += ytdBaselineOmr;

    const monthReturnPct =
      monthBaselineOmr > 0 ? ((currentOmr - monthBaselineOmr) / monthBaselineOmr) * 100 : null;

    const rowHref =
      asset.category === "PUBLIC_EQUITY" ? "/portfolio/public-markets" : `/assets/${asset.id}`;

    assetRows.push({
      id: asset.id,
      name: asset.name,
      href: rowHref,
      currentValueOmr: currentOmr,
      monthStartValueOmr: monthBaselineOmr,
      monthReturnPct,
    });

    if (asset.category === "PUBLIC_EQUITY") {
      publicEquityAssets.push(asset);
      continue;
    }

    if (monthBaselineOmr > 0 && monthReturnPct != null) {
      monthPerformers.push({
        name: asset.name,
        returnPct: monthReturnPct,
        href: `/assets/${asset.id}`,
      });
    }
  }

  monthPerformers.push(
    ...(await collectPublicEquityHoldingPerformers(publicEquityAssets, monthStart)),
  );

  const monthReturn = computePortfolioReturn(currentTotalOmr, monthBaselineTotalOmr);
  const ytdReturn = computePortfolioReturn(currentTotalOmr, ytdBaselineTotalOmr);

  const sortedPerformers = [...monthPerformers].sort((a, b) => b.returnPct - a.returnPct);
  const bestPerformer = sortedPerformers[0] ?? null;
  const worstPerformer =
    sortedPerformers.length > 1 ? sortedPerformers[sortedPerformers.length - 1] : null;

  assetRows.sort((a, b) => (b.monthReturnPct ?? -Infinity) - (a.monthReturnPct ?? -Infinity));

  return {
    monthReturnOmr: monthReturn?.returnOmr ?? null,
    monthReturnPct: monthReturn?.returnPct ?? null,
    ytdReturnOmr: ytdReturn?.returnOmr ?? null,
    ytdReturnPct: ytdReturn?.returnPct ?? null,
    bestPerformer,
    worstPerformer:
      worstPerformer && bestPerformer && worstPerformer.href !== bestPerformer.href
        ? worstPerformer
        : null,
    hasSufficientData: monthBaselineTotalOmr > 0 || ytdBaselineTotalOmr > 0,
    assetRows,
  };
}

export async function getPortfolioPerformance(
  ctx: UserContext,
  options: PortfolioPerformanceOptions = {},
): Promise<PortfolioPerformance> {
  await backfillAssetValuations(ctx);
  return computePortfolioPerformance(ctx, options);
}
