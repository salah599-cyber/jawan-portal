import { db } from "@/lib/db";
import { startOfMonth } from "@/lib/calendar/date-ranges";
import { backfillAssetValuations, getAssetValueAtDate } from "@/lib/portfolio/valuations";
import { assetEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";
import { convertToOmr, entityWhere } from "@/lib/reports/helpers";

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

async function getWeightedOmrAtDate(
  asset: {
    id: string;
    currency: string;
    ownershipPct: { toString(): string };
  },
  asOfDate: Date,
): Promise<number> {
  const snapshot = await getAssetValueAtDate(asset.id, asOfDate);
  if (!snapshot) return 0;

  const pct = parseFloat(asset.ownershipPct.toString());
  if (Number.isNaN(pct)) return 0;

  const weighted = (snapshot.value * pct) / 100;
  if (weighted <= 0) return 0;
  return convertToOmr(weighted, snapshot.currency);
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
      currentValue: true,
      currency: true,
      ownershipPct: true,
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

  for (const asset of assets) {
    const currentWeighted = weightedValue(asset.currentValue, asset.ownershipPct);
    if (currentWeighted <= 0) continue;

    const currentOmr = await convertToOmr(currentWeighted, asset.currency);
    const monthBaselineOmr = await getWeightedOmrAtDate(asset, monthStart);
    const ytdBaselineOmr = await getWeightedOmrAtDate(asset, yearStart);

    currentTotalOmr += currentOmr;
    monthBaselineTotalOmr += monthBaselineOmr;
    ytdBaselineTotalOmr += ytdBaselineOmr;

    const monthReturnPct =
      monthBaselineOmr > 0 ? ((currentOmr - monthBaselineOmr) / monthBaselineOmr) * 100 : null;

    assetRows.push({
      id: asset.id,
      name: asset.name,
      href: `/assets/${asset.id}`,
      currentValueOmr: currentOmr,
      monthStartValueOmr: monthBaselineOmr,
      monthReturnPct,
    });

    if (monthBaselineOmr > 0 && monthReturnPct != null) {
      monthPerformers.push({
        name: asset.name,
        returnPct: monthReturnPct,
        href: `/assets/${asset.id}`,
      });
    }
  }

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
