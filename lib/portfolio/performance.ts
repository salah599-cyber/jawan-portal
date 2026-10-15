import { db } from "@/lib/db";
import { getAssetLinkedModule } from "@/lib/assets/linked-module";
import { MARKET_CONFIG, PUBLIC_MARKETS_PATH, PRIVATE_PORTFOLIO_SLUG } from "@/lib/public-markets/constants";
import {
  computePortfolioTotalsOmr,
  getManagedPortfolioPerformanceBaselineAtDate,
} from "@/lib/portfolio/managed-portfolio-valuations";
import {
  getPerformancePeriodStart,
  type PerformancePeriod,
} from "@/lib/portfolio/performance-period";
import {
  backfillAssetValuations,
  getPerformanceBaselineAtDate,
} from "@/lib/portfolio/valuations";
import {
  computeStatementReturnMetrics,
  type StatementReturnMetrics,
} from "@/lib/portfolio/statement-performance";
import {
  computeReturn,
  holdingReturnPct,
  pickBestWorstPerformers,
} from "@/lib/portfolio/return-math";
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
  /** Live marks: refreshed prices and recorded asset valuations. */
  periodReturnOmr: number | null;
  periodReturnPct: number | null;
  ytdReturnOmr: number | null;
  ytdReturnPct: number | null;
  /** Broker statement snapshots from imports (public markets); other assets use valuations. */
  statementReturn: StatementReturnMetrics;
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
  entityId: string;
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

/**
 * Rank individual public-equity holdings by unrealized return versus their own
 * total cost basis. Parent-portfolio proportional allocation is intentionally
 * avoided: it assigns every holding the same percentage and surfaces absurd
 * figures when the parent baseline is weak.
 */
async function collectPublicEquityHoldingPerformers(
  publicEquityAssets: PerformanceAsset[],
): Promise<AssetPerformer[]> {
  if (publicEquityAssets.length === 0) return [];

  const holdings = await db.publicEquityHolding.findMany({
    where: {
      assetId: { in: publicEquityAssets.map((asset) => asset.id) },
      instrumentType: "EQUITY",
    },
    select: {
      symbol: true,
      name: true,
      market: true,
      quantity: true,
      costBasis: true,
      marketValue: true,
    },
  });

  const performers: AssetPerformer[] = [];

  for (const holding of holdings) {
    const quantity = holding.quantity ? parseFloat(holding.quantity.toString()) : 0;
    const costBasis = holding.costBasis ? parseFloat(holding.costBasis.toString()) : null;
    const marketValue = holding.marketValue ? parseFloat(holding.marketValue.toString()) : null;

    const returnPct = holdingReturnPct({
      quantity: Number.isFinite(quantity) ? quantity : 0,
      costBasis: costBasis != null && !Number.isNaN(costBasis) ? costBasis : null,
      marketValue: marketValue != null && !Number.isNaN(marketValue) ? marketValue : null,
    });
    if (returnPct == null) continue;

    const label = holding.name?.trim()
      ? `${holding.symbol} — ${holding.name}`
      : holding.symbol;
    const marketLabel = MARKET_CONFIG[holding.market]?.shortLabel ?? holding.market;

    performers.push({
      name: `${label} (${marketLabel})`,
      returnPct,
      href: publicMarketHref(holding.market),
    });
  }

  return performers;
}

function parseOwnershipPct(ownershipPct: { toString(): string }): number {
  const pct = parseFloat(ownershipPct.toString());
  return Number.isNaN(pct) ? 0 : pct;
}

/**
 * Per-slice managed portfolio return using that slice's own valuation/cost
 * baseline — not a share of the parent public-equity asset return.
 */
async function managedPortfolioPeriodReturnPct(
  entityId: string,
  managedPortfolioId: string | null,
  periodStart: Date,
  ownershipPct: number,
): Promise<number | null> {
  const totals = await computePortfolioTotalsOmr(entityId, managedPortfolioId);
  if (totals.valueOmr <= 0) return null;

  const sliceCurrentOmr = (totals.valueOmr * ownershipPct) / 100;
  if (sliceCurrentOmr <= 0) return null;

  const snapshotBaseline = await getManagedPortfolioPerformanceBaselineAtDate(
    entityId,
    managedPortfolioId,
    periodStart,
  );
  if (snapshotBaseline == null || snapshotBaseline <= 0) return null;

  const periodBaselineOmr = (snapshotBaseline * ownershipPct) / 100;
  if (periodBaselineOmr <= 0) return null;

  return ((sliceCurrentOmr - periodBaselineOmr) / periodBaselineOmr) * 100;
}

async function collectManagedPortfolioPerformers(
  entityIds: string[],
  publicEquityAssets: PerformanceAsset[],
  periodStart: Date,
): Promise<AssetPerformer[]> {
  if (entityIds.length === 0) return [];

  const performers: AssetPerformer[] = [];
  const uniqueEntityIds = [...new Set(entityIds)];

  for (const entityId of uniqueEntityIds) {
    const entityAssets = publicEquityAssets.filter((asset) => asset.entityId === entityId);
    const ownershipPct = entityAssets.reduce(
      (max, asset) => Math.max(max, parseOwnershipPct(asset.ownershipPct)),
      0,
    );
    if (ownershipPct <= 0) continue;

    const privateReturnPct = await managedPortfolioPeriodReturnPct(
      entityId,
      null,
      periodStart,
      ownershipPct,
    );
    if (privateReturnPct != null) {
      performers.push({
        name: "Private holdings",
        returnPct: privateReturnPct,
        href: `${PUBLIC_MARKETS_PATH}?entity=${entityId}&portfolio=${PRIVATE_PORTFOLIO_SLUG}`,
      });
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
      const returnPct = await managedPortfolioPeriodReturnPct(
        entityId,
        portfolio.id,
        periodStart,
        ownershipPct,
      );
      if (returnPct == null) continue;

      performers.push({
        name: `${portfolio.managerName} — ${portfolio.name}`,
        returnPct,
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

  const emptyStatementReturn: StatementReturnMetrics = {
    periodReturnOmr: null,
    periodReturnPct: null,
    ytdReturnOmr: null,
    ytdReturnPct: null,
    lastStatementDate: null,
    awaitingPeriodStatement: false,
  };

  const empty: PortfolioPerformance = {
    period,
    periodReturnOmr: null,
    periodReturnPct: null,
    ytdReturnOmr: null,
    ytdReturnPct: null,
    statementReturn: emptyStatementReturn,
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

  let periodCurrentTotalOmr = 0;
  let periodBaselineTotalOmr = 0;
  let ytdCurrentTotalOmr = 0;
  let ytdBaselineTotalOmr = 0;
  let nonPublicPeriodCurrentOmr = 0;
  let nonPublicPeriodBaselineOmr = 0;
  let nonPublicYtdCurrentOmr = 0;
  let nonPublicYtdBaselineOmr = 0;

  const periodPerformers: AssetPerformer[] = [];
  const assetRows: AssetPerformanceRow[] = [];
  const publicEquityAssets: PerformanceAsset[] = [];

  for (const asset of assets) {
    const currentWeighted = weightedValue(asset.currentValue, asset.ownershipPct);
    if (currentWeighted <= 0) continue;

    const currentOmr = await convertToOmr(currentWeighted, asset.currency);
    const periodBaselineOmr = await getWeightedBaselineOmrAtDate(asset, periodStart);
    const ytdBaselineOmr = await getWeightedBaselineOmrAtDate(asset, yearStart);

    // Pair current with baseline: including current without a baseline inflates returns.
    if (periodBaselineOmr > 0) {
      periodCurrentTotalOmr += currentOmr;
      periodBaselineTotalOmr += periodBaselineOmr;
      if (asset.category !== "PUBLIC_EQUITY") {
        nonPublicPeriodCurrentOmr += currentOmr;
        nonPublicPeriodBaselineOmr += periodBaselineOmr;
      }
    }

    if (ytdBaselineOmr > 0) {
      ytdCurrentTotalOmr += currentOmr;
      ytdBaselineTotalOmr += ytdBaselineOmr;
      if (asset.category !== "PUBLIC_EQUITY") {
        nonPublicYtdCurrentOmr += currentOmr;
        nonPublicYtdBaselineOmr += ytdBaselineOmr;
      }
    }

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

  const entityIds = options.entityId
    ? [options.entityId]
    : [...new Set(assets.map((asset) => asset.entityId))];

  periodPerformers.push(...(await collectPublicEquityHoldingPerformers(publicEquityAssets)));

  if (publicEquityAssets.length > 0 && entityIds.length > 0) {
    periodPerformers.push(
      ...(await collectManagedPortfolioPerformers(entityIds, publicEquityAssets, periodStart)),
    );
  }

  const periodReturn = computeReturn(periodCurrentTotalOmr, periodBaselineTotalOmr);
  const ytdReturn = computeReturn(ytdCurrentTotalOmr, ytdBaselineTotalOmr);

  const statementReturn = await computeStatementReturnMetrics(
    entityIds,
    periodStart,
    yearStart,
    {
      currentOmr: nonPublicPeriodCurrentOmr,
      periodBaselineOmr: nonPublicPeriodBaselineOmr,
      ytdCurrentOmr: nonPublicYtdCurrentOmr,
      ytdBaselineOmr: nonPublicYtdBaselineOmr,
    },
  );

  const { best: bestPerformer, worst: worstPerformer } =
    pickBestWorstPerformers(periodPerformers);

  assetRows.sort((a, b) => (b.periodReturnPct ?? -Infinity) - (a.periodReturnPct ?? -Infinity));

  return {
    period,
    periodReturnOmr: periodReturn?.returnOmr ?? null,
    periodReturnPct: periodReturn?.returnPct ?? null,
    ytdReturnOmr: ytdReturn?.returnOmr ?? null,
    ytdReturnPct: ytdReturn?.returnPct ?? null,
    statementReturn,
    bestPerformer,
    worstPerformer,
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
