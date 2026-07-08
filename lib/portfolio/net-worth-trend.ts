import { endOfDay } from "@/lib/calendar/date-ranges";
import { db } from "@/lib/db";
import { convertToOmr } from "@/lib/fx";
import { getModulePermission } from "@/lib/permissions/access";
import { assetEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";
import type { PortfolioRollup } from "@/lib/portfolio/rollup";
import { backfillAssetValuations } from "@/lib/portfolio/valuations";
import { entityWhere } from "@/lib/reports/helpers";

const COUNTABLE_ASSET_STATUSES = ["ACTIVE", "MONITOR"] as const;

export type NetWorthTrendPoint = {
  date: string;
  label: string;
  portfolioOmr: number;
  liabilityOmr: number;
  netWorthOmr: number;
};

export type NetWorthTrend = {
  points: NetWorthTrendPoint[];
  hasSufficientData: boolean;
  currentNetWorthOmr: number;
};

type AssetRow = {
  id: string;
  currency: string;
  ownershipPct: { toString(): string };
  acquisitionCost: { toString(): string } | null;
  acquisitionDate: Date | null;
};

type LiabilityRow = {
  id: string;
  amount: { toString(): string };
  currency: string;
  startDate: Date | null;
  maturityDate: Date | null;
};

type ValuationRow = {
  assetId: string;
  value: { toString(): string };
  currency: string;
  valuedAt: Date;
};

type PaymentRow = {
  liabilityId: string;
  paymentDate: Date;
  balanceAfter: { toString(): string };
};

function liabilityEntityFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "ASSETS");
  if (level === "FULL" || level === "READ") return {};
  if (level === "FILTERED") return { entityId: { in: ctx.entityIds } };
  return { id: "__none__" };
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatAnchorLabel(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function buildMonthlyAnchors(now: Date): Date[] {
  const anchors: Date[] = [];
  for (let monthsAgo = 12; monthsAgo >= 1; monthsAgo--) {
    const month = now.getMonth() - monthsAgo;
    anchors.push(endOfDay(new Date(now.getFullYear(), month + 1, 0)));
  }
  anchors.push(now);
  return anchors;
}

function getAssetValueAtDateFromCache(
  asset: AssetRow,
  valuations: ValuationRow[],
  asOfDate: Date,
): { value: number; currency: string } | null {
  const snapshot = valuations.find((valuation) => valuation.valuedAt < asOfDate);
  if (snapshot) {
    const value = parseFloat(snapshot.value.toString());
    if (!Number.isNaN(value) && value > 0) {
      return { value, currency: snapshot.currency };
    }
  }

  if (!asset.acquisitionCost || !asset.acquisitionDate || asset.acquisitionDate >= asOfDate) {
    return null;
  }

  const cost = parseFloat(asset.acquisitionCost.toString());
  if (Number.isNaN(cost) || cost <= 0) return null;
  return { value: cost, currency: asset.currency };
}

function getLiabilityBalanceAtDateFromCache(
  liability: LiabilityRow,
  payments: PaymentRow[],
  asOfDate: Date,
): number {
  if (liability.startDate && liability.startDate > asOfDate) return 0;
  if (liability.maturityDate && liability.maturityDate < asOfDate) return 0;

  const latestPayment = payments.find((payment) => payment.paymentDate <= asOfDate);
  if (latestPayment) {
    const balance = parseFloat(latestPayment.balanceAfter.toString());
    if (!Number.isNaN(balance) && balance >= 0) return balance;
  }

  const amount = parseFloat(liability.amount.toString());
  return Number.isNaN(amount) || amount < 0 ? 0 : amount;
}

async function getWeightedPortfolioOmrAtDate(
  assets: AssetRow[],
  valuationsByAsset: Map<string, ValuationRow[]>,
  asOfDate: Date,
): Promise<number> {
  let total = 0;

  for (const asset of assets) {
    const snapshot = getAssetValueAtDateFromCache(
      asset,
      valuationsByAsset.get(asset.id) ?? [],
      asOfDate,
    );
    if (!snapshot) continue;

    const pct = parseFloat(asset.ownershipPct.toString());
    if (Number.isNaN(pct)) continue;

    const weighted = (snapshot.value * pct) / 100;
    if (weighted <= 0) continue;
    total += await convertToOmr(weighted, snapshot.currency);
  }

  return total;
}

async function getLiabilityTotalOmrAtDate(
  liabilities: LiabilityRow[],
  paymentsByLiability: Map<string, PaymentRow[]>,
  asOfDate: Date,
): Promise<number> {
  const totalsByCurrency = new Map<string, number>();

  for (const liability of liabilities) {
    const balance = getLiabilityBalanceAtDateFromCache(
      liability,
      paymentsByLiability.get(liability.id) ?? [],
      asOfDate,
    );
    if (balance <= 0) continue;
    totalsByCurrency.set(
      liability.currency,
      (totalsByCurrency.get(liability.currency) ?? 0) + balance,
    );
  }

  let total = 0;
  for (const [currency, amount] of totalsByCurrency.entries()) {
    total += await convertToOmr(amount, currency);
  }
  return total;
}

export async function getNetWorthTrend(
  ctx: UserContext,
  rollup: PortfolioRollup,
): Promise<NetWorthTrend> {
  await backfillAssetValuations(ctx);

  const now = new Date();
  const anchors = buildMonthlyAnchors(now);
  const todayKey = toDateKey(now);

  const assets = await db.asset.findMany({
    where: {
      ...entityWhere(undefined, assetEntityFilter(ctx)),
      status: { in: [...COUNTABLE_ASSET_STATUSES] },
    },
    select: {
      id: true,
      currency: true,
      ownershipPct: true,
      acquisitionCost: true,
      acquisitionDate: true,
    },
  });

  const assetIds = assets.map((asset) => asset.id);
  const valuations =
    assetIds.length > 0
      ? await db.assetValuation.findMany({
          where: { assetId: { in: assetIds } },
          orderBy: { valuedAt: "desc" },
          select: {
            assetId: true,
            value: true,
            currency: true,
            valuedAt: true,
          },
        })
      : [];

  const valuationsByAsset = new Map<string, ValuationRow[]>();
  for (const valuation of valuations) {
    const rows = valuationsByAsset.get(valuation.assetId) ?? [];
    rows.push(valuation);
    valuationsByAsset.set(valuation.assetId, rows);
  }

  const liabilities = await db.liability.findMany({
    where: {
      ...entityWhere(undefined, liabilityEntityFilter(ctx)),
      status: "ACTIVE",
    },
    select: {
      id: true,
      amount: true,
      currency: true,
      startDate: true,
      maturityDate: true,
    },
  });

  const liabilityIds = liabilities.map((liability) => liability.id);
  const payments =
    liabilityIds.length > 0
      ? await db.loanPayment.findMany({
          where: { liabilityId: { in: liabilityIds } },
          orderBy: { paymentDate: "desc" },
          select: {
            liabilityId: true,
            paymentDate: true,
            balanceAfter: true,
          },
        })
      : [];

  const paymentsByLiability = new Map<string, PaymentRow[]>();
  for (const payment of payments) {
    const rows = paymentsByLiability.get(payment.liabilityId) ?? [];
    rows.push(payment);
    paymentsByLiability.set(payment.liabilityId, rows);
  }

  const points: NetWorthTrendPoint[] = [];

  for (const anchor of anchors) {
    const dateKey = toDateKey(anchor);
    const isToday = dateKey === todayKey;

    if (isToday) {
      points.push({
        date: dateKey,
        label: "Today",
        portfolioOmr: rollup.portfolioTotalOmr,
        liabilityOmr: rollup.liabilityTotalOmr,
        netWorthOmr: rollup.netWorthTotalOmr,
      });
      continue;
    }

    const portfolioOmr = await getWeightedPortfolioOmrAtDate(assets, valuationsByAsset, anchor);
    const liabilityOmr = await getLiabilityTotalOmrAtDate(
      liabilities,
      paymentsByLiability,
      anchor,
    );

    points.push({
      date: dateKey,
      label: formatAnchorLabel(anchor),
      portfolioOmr,
      liabilityOmr,
      netWorthOmr: portfolioOmr - liabilityOmr,
    });
  }

  const meaningfulPoints = points.filter((point) => point.netWorthOmr > 0);
  const hasSufficientData = meaningfulPoints.length >= 2;

  return {
    points,
    hasSufficientData,
    currentNetWorthOmr: rollup.netWorthTotalOmr,
  };
}
