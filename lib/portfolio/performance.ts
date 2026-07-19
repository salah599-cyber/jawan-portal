import { db } from "@/lib/db";
import { getAssetLinkedModule } from "@/lib/assets/linked-module";
import { MARKET_CONFIG, PUBLIC_MARKETS_PATH, PRIVATE_PORTFOLIO_SLUG } from "@/lib/public-markets/constants";
import {
  computePortfolioTotalsOmr,
  getManagedPortfolioValueAtDate,
} from "@/lib/portfolio/managed-portfolio-valuations";
import {
  getPerformancePeriodStart,
  type PerformancePeriod,
} from "@/lib/portfolio/performance-period";
import {
  backfillAssetValuations,
  getPerformanceBaselineAtDate,
} from "@/lib/portfolio/valuations";
import { assetEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";
import { convertToOmr, entityWhere } from "@/lib/reports/helpers";
import type { PublicMarket } from "@/lib/generated/prisma/client";

const COUNTABLE_ASSET_STATUSES = ["ACTIVE", "MONITOR"] as const;

export type { PerformancePeriod } from "@/lib/portfolio/performance-period";

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
  periodStartValueOmr: number;
  periodReturnPct: number | null;
};

export type PortfolioPerformance = {
  period: PerformancePeriod;
  periodReturnOmr: number | null;
  periodReturnPct: number | null;
  ytdReturnOmr: number | null;
  ytdReturnPct: number | null;
  bestPerformer: AssetPerformer | null;
  worstPerformer: AssetPerformer | null;
  hasSufficientData: boolean;
  assetRows: AssetPerformanceRow[];
};

export type PortfolioPerformanceOptions = {
  entityId?: string;
  period?: PerformancePeriod;
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
  landParcel?: { id: string } | null;
  vehicle?: { id: string } | null;
  registeredCompany?: { id: string } | null;
  peCompany?: { id: string } | null;
  lpCommitment?: { id: string } | null;
  reProperty?: { id: string } | null;
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

function assetPerformerHref(asset: PerformanceAsset): string {
  const linked = getAssetLinkedModule(asset);
  if (linked) return linked.href;
  if (asset.category === "PUBLIC_EQUITY") return "/portfolio/public-markets";
  return `/assets/${asset.id}`;
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
  periodStart: Date,
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
        await getWeightedBaselineOmrAtDate(asset, periodStart),
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

    let periodBaselineOmr = 0;
    if (parentCurrent > 0 && parentBaseline > 0) {
      periodBaselineOmr = (currentOmr / parentCurrent) * parentBaseline;
    }

    if (periodBaselineOmr <= 0) continue;

    const periodReturnPct = ((currentOmr - periodBaselineOmr) / periodBaselineOmr) * 100;
    const label = holding.name?.trim()
      ? `${holding.symbol} — ${holding.name}`
      : holding.symbol;
    const marketLabel = MARKET_CONFIG[holding.market]?.shortLabel ?? holding.market;

    performers.push({
      name: `${label} (${marketLabel})`,
      returnPct: periodReturnPct,
      href: publicMarketHref(holding.market),
    });
  }

  return performers;
}

async function collectManagedPortfolioPerformers(
  entityIds: string[],
  periodStart: Date,
): Promise<AssetPerformer[]> {
  if (entityIds.length === 0) return [];

  const performers: AssetPerformer[] = [];
  const uniqueEntityIds = [...new Set(entityIds)];

  for (const entityId of uniqueEntityIds) {
    const privateTotals = await computePortfolioTotalsOmr(entityId, null);
    if (privateTotals.valueOmr > 0) {
      const privateBaseline = await getManagedPortfolioValueAtDate(entityId, null, periodStart);
      if (privateBaseline != null && privateBaseline > 0) {
        performers.push({
          name: "Private holdings",
          returnPct: ((privateTotals.valueOmr - privateBaseline) / privateBaseline) * 100,
          href: `${PUBLIC_MARKETS_PATH}?entity=${entityId}&portfolio=${PRIVATE_PORTFOLIO_SLUG}`,
        });
      }
    }

    const portfolios = await db.managedPortfolio.findMany({
      where: {
        entityId,
        status: { in: ["ACTIVE", "MONITOR"] },
      },
      select: {
        id: true,
        name: true,
        managerName: true,
      },
    });

    for (const portfolio of portfolios) {
      const totals = await computePortfolioTotalsOmr(entityId, portfolio.id);
      if (totals.valueOmr <= 0) continue;

      const baseline = await getManagedPortfolioValueAtDate(entityId, portfolio.id, periodStart);
      if (baseline == null || baseline <= 0) continue;

      performers.push({
        name: `${portfolio.managerName} — ${portfolio.name}`,
        returnPct: ((totals.valueOmr - baseline) / baseline) * 100,
        href: `${PUBLIC_MARKETS_PATH}?entity=${entityId}&portfolio=${portfolio.id}`,
      });
    }
  }

  return performers;
}

export async function computePortfolioPerformance(
  ctx: UserContext,
  options: PortfolioPerformanceOptions = {},
): Promise<PortfolioPerformance> {
  const period = options.period ?? "month";

  const empty: PortfolioPerformance = {
    period,
    periodReturnOmr: null,
    periodReturnPct: null,
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
      entityId: true,
      name: true,
      category: true,
      currentValue: true,
      currency: true,
      ownershipPct: true,
      acquisitionCost: true,
      acquisitionDate: true,
      landParcel: { select: { id: true } },
      vehicle: { select: { id: true } },
      registeredCompany: { select: { id: true } },
      peCompany: { select: { id: true } },
      lpCommitment: { select: { id: true } },
      reProperty: { select: { id: true } },
    },
  });

  if (assets.length === 0) return empty;

  const now = new Date();
  const periodStart = getPerformancePeriodStart(period, now);
  const yearStart = startOfYear(now);

  let currentTotalOmr = 0;
  let periodBaselineTotalOmr = 0;
  let ytdBaselineTotalOmr = 0;

  const periodPerformers: AssetPerformer[] = [];
  const assetRows: AssetPerformanceRow[] = [];
  const publicEquityAssets: PerformanceAsset[] = [];

  for (const asset of assets) {
    const currentWeighted = weightedValue(asset.currentValue, asset.ownershipPct);
    if (currentWeighted <= 0) continue;

    const currentOmr = await convertToOmr(currentWeighted, asset.currency);
    const periodBaselineOmr = await getWeightedBaselineOmrAtDate(asset, periodStart);
    const ytdBaselineOmr = await getWeightedBaselineOmrAtDate(asset, yearStart);

    currentTotalOmr += currentOmr;
    periodBaselineTotalOmr += periodBaselineOmr;
    ytdBaselineTotalOmr += ytdBaselineOmr;

    const periodReturnPct =
      periodBaselineOmr > 0 ? ((currentOmr - periodBaselineOmr) / periodBaselineOmr) * 100 : null;

    assetRows.push({
      id: asset.id,
      name: asset.name,
      href: assetPerformerHref(asset),
      currentValueOmr: currentOmr,
      periodStartValueOmr: periodBaselineOmr,
      periodReturnPct,
    });

    if (asset.category === "PUBLIC_EQUITY") {
      publicEquityAssets.push(asset);
      continue;
    }

    if (periodBaselineOmr > 0 && periodReturnPct != null) {
      periodPerformers.push({
        name: asset.name,
        returnPct: periodReturnPct,
        href: assetPerformerHref(asset),
      });
    }
  }

  periodPerformers.push(
    ...(await collectPublicEquityHoldingPerformers(publicEquityAssets, periodStart)),
  );

  const entityIds = options.entityId
    ? [options.entityId]
    : [...new Set(assets.map((asset) => asset.entityId))];

  if (publicEquityAssets.length > 0 && entityIds.length > 0) {
    periodPerformers.push(...(await collectManagedPortfolioPerformers(entityIds, periodStart)));
  }

  const periodReturn = computePortfolioReturn(currentTotalOmr, periodBaselineTotalOmr);
  const ytdReturn = computePortfolioReturn(currentTotalOmr, ytdBaselineTotalOmr);

  const sortedPerformers = [...periodPerformers].sort((a, b) => b.returnPct - a.returnPct);
  const bestPerformer = sortedPerformers[0] ?? null;
  const worstPerformer =
    sortedPerformers.length > 1 ? sortedPerformers[sortedPerformers.length - 1] : null;

  assetRows.sort((a, b) => (b.periodReturnPct ?? -Infinity) - (a.periodReturnPct ?? -Infinity));

  return {
    period,
    periodReturnOmr: periodReturn?.returnOmr ?? null,
    periodReturnPct: periodReturn?.returnPct ?? null,
    ytdReturnOmr: ytdReturn?.returnOmr ?? null,
    ytdReturnPct: ytdReturn?.returnPct ?? null,
    bestPerformer,
    worstPerformer:
      worstPerformer && bestPerformer && worstPerformer.href !== bestPerformer.href
        ? worstPerformer
        : null,
    hasSufficientData: periodBaselineTotalOmr > 0 || ytdBaselineTotalOmr > 0,
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
