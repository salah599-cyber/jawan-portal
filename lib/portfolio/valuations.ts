import { db } from "@/lib/db";
import { assetEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";
import { convertToOmr } from "@/lib/reports/helpers";

const COUNTABLE_ASSET_STATUSES = ["ACTIVE", "MONITOR"] as const;

function sameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export type RecordAssetValuationInput = {
  assetId: string;
  value: number;
  currency: string;
  valuedAt?: Date;
  notes?: string;
};

export async function recordAssetValuation({
  assetId,
  value,
  currency,
  valuedAt = new Date(),
  notes,
}: RecordAssetValuationInput): Promise<void> {
  if (value <= 0) return;

  const latest = await db.assetValuation.findFirst({
    where: { assetId },
    orderBy: { valuedAt: "desc" },
  });

  if (
    latest &&
    latest.value.toString() === value.toString() &&
    latest.currency === currency &&
    sameUtcDay(latest.valuedAt, valuedAt)
  ) {
    return;
  }

  await db.assetValuation.create({
    data: {
      assetId,
      value: value.toString(),
      currency,
      valuedAt,
      notes,
    },
  });
}

export async function getAssetValueAtDate(
  assetId: string,
  asOfDate: Date,
): Promise<{ value: number; currency: string } | null> {
  const valuation = await db.assetValuation.findFirst({
    where: {
      assetId,
      valuedAt: { lt: asOfDate },
    },
    orderBy: { valuedAt: "desc" },
  });

  if (valuation) {
    const value = parseFloat(valuation.value.toString());
    if (!Number.isNaN(value) && value > 0) {
      return { value, currency: valuation.currency };
    }
  }

  const asset = await db.asset.findUnique({
    where: { id: assetId },
    select: {
      acquisitionCost: true,
      acquisitionDate: true,
      currency: true,
    },
  });

  if (!asset?.acquisitionCost || !asset.acquisitionDate || asset.acquisitionDate >= asOfDate) {
    return null;
  }

  const cost = parseFloat(asset.acquisitionCost.toString());
  if (Number.isNaN(cost) || cost <= 0) return null;

  return { value: cost, currency: asset.currency };
}

type PerformanceBaselineAsset = {
  id: string;
  currency: string;
  category: string;
  acquisitionCost: { toString(): string } | null;
  acquisitionDate: Date | null;
};

/**
 * Baseline value for period returns (month / YTD). Unlike {@link getAssetValueAtDate},
 * this avoids using a years-old acquisition cost as a faux month-start value when
 * valuation history exists only from the current period.
 */
export async function getPerformanceBaselineAtDate(
  asset: PerformanceBaselineAsset,
  periodStart: Date,
): Promise<{ value: number; currency: string } | null> {
  const valuationBeforePeriod = await db.assetValuation.findFirst({
    where: {
      assetId: asset.id,
      valuedAt: { lt: periodStart },
    },
    orderBy: { valuedAt: "desc" },
  });

  if (valuationBeforePeriod) {
    const value = parseFloat(valuationBeforePeriod.value.toString());
    if (!Number.isNaN(value) && value > 0) {
      return { value, currency: valuationBeforePeriod.currency };
    }
  }

  const firstValuationInPeriod = await db.assetValuation.findFirst({
    where: {
      assetId: asset.id,
      valuedAt: { gte: periodStart },
    },
    orderBy: { valuedAt: "asc" },
  });

  if (firstValuationInPeriod) {
    const value = parseFloat(firstValuationInPeriod.value.toString());
    if (!Number.isNaN(value) && value > 0) {
      return { value, currency: firstValuationInPeriod.currency };
    }
  }

  if (asset.category === "PUBLIC_EQUITY") {
    const holdings = await db.publicEquityHolding.findMany({
      where: { assetId: asset.id },
      select: { costBasis: true, currency: true },
    });

    let costTotalOmr = 0;
    for (const holding of holdings) {
      if (!holding.costBasis) continue;
      const cost = parseFloat(holding.costBasis.toString());
      if (Number.isNaN(cost) || cost <= 0) continue;
      costTotalOmr += await convertToOmr(cost, holding.currency || asset.currency);
    }

    if (costTotalOmr > 0) {
      return { value: costTotalOmr, currency: "OMR" };
    }

    return null;
  }

  if (
    asset.acquisitionCost &&
    asset.acquisitionDate &&
    asset.acquisitionDate >= periodStart
  ) {
    const cost = parseFloat(asset.acquisitionCost.toString());
    if (!Number.isNaN(cost) && cost > 0) {
      return { value: cost, currency: asset.currency };
    }
  }

  return null;
}

export async function backfillAssetValuations(ctx: UserContext): Promise<void> {
  const assets = await db.asset.findMany({
    where: {
      ...assetEntityFilter(ctx),
      status: { in: [...COUNTABLE_ASSET_STATUSES] },
      currentValue: { not: null },
    },
    select: {
      id: true,
      currentValue: true,
      currency: true,
      valueUpdatedAt: true,
      acquisitionDate: true,
      valuations: { select: { id: true }, take: 1 },
    },
  });

  await Promise.all(
    assets
      .filter((asset) => asset.valuations.length === 0)
      .map((asset) => {
        const value = parseFloat(asset.currentValue!.toString());
        if (Number.isNaN(value) || value <= 0) return Promise.resolve();

        return recordAssetValuation({
          assetId: asset.id,
          value,
          currency: asset.currency,
          valuedAt: asset.valueUpdatedAt ?? asset.acquisitionDate ?? new Date(),
          notes: "Initial valuation backfill",
        });
      }),
  );
}
