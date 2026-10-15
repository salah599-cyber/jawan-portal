import { db } from "@/lib/db";
import { assetEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";
import {
  resolveTotalCostBasis,
  selectReliableBaseline,
} from "@/lib/portfolio/return-math";
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

async function sumPublicEquityCostBasisOmr(
  assetId: string,
  assetCurrency: string,
): Promise<number> {
  const holdings = await db.publicEquityHolding.findMany({
    where: { assetId, instrumentType: "EQUITY" },
    select: {
      quantity: true,
      costBasis: true,
      marketValue: true,
      currency: true,
    },
  });

  let costTotalOmr = 0;
  for (const holding of holdings) {
    const quantity = holding.quantity ? parseFloat(holding.quantity.toString()) : 0;
    const rawCost = holding.costBasis ? parseFloat(holding.costBasis.toString()) : null;
    const marketValue = holding.marketValue
      ? parseFloat(holding.marketValue.toString())
      : null;
    const totalCost = resolveTotalCostBasis({
      quantity: Number.isFinite(quantity) ? quantity : 0,
      costBasis: rawCost != null && !Number.isNaN(rawCost) ? rawCost : null,
      marketValue: marketValue != null && !Number.isNaN(marketValue) ? marketValue : null,
    });
    if (totalCost == null || totalCost <= 0) continue;
    costTotalOmr += await convertToOmr(totalCost, holding.currency || assetCurrency);
  }

  return costTotalOmr;
}

async function parsePositiveValuation(
  row: { value: { toString(): string }; currency: string } | null,
): Promise<{ valueOmr: number } | null> {
  if (!row) return null;
  const value = parseFloat(row.value.toString());
  if (Number.isNaN(value) || value <= 0) return null;
  const valueOmr = row.currency === "OMR" ? value : await convertToOmr(value, row.currency);
  if (!(valueOmr > 0)) return null;
  return { valueOmr };
}

/**
 * Baseline value for period returns (month / YTD). Unlike {@link getAssetValueAtDate},
 * this avoids using a years-old acquisition cost as a faux month-start value when
 * valuation history exists only from the current period.
 *
 * Tiny/stale valuation snapshots that imply absurd period returns are discarded in
 * favour of a more reliable cost-basis baseline when available.
 */
export async function getPerformanceBaselineAtDate(
  asset: PerformanceBaselineAsset,
  periodStart: Date,
): Promise<{ value: number; currency: string } | null> {
  const [valuationBeforePeriod, firstValuationInPeriod] = await Promise.all([
    db.assetValuation.findFirst({
      where: { assetId: asset.id, valuedAt: { lt: periodStart } },
      orderBy: { valuedAt: "desc" },
    }),
    db.assetValuation.findFirst({
      where: { assetId: asset.id, valuedAt: { gte: periodStart } },
      orderBy: { valuedAt: "asc" },
    }),
  ]);

  const before = await parsePositiveValuation(valuationBeforePeriod);
  const firstInPeriod = await parsePositiveValuation(firstValuationInPeriod);

  let costBasisOmr: number | null = null;
  if (asset.category === "PUBLIC_EQUITY") {
    const total = await sumPublicEquityCostBasisOmr(asset.id, asset.currency);
    costBasisOmr = total > 0 ? total : null;
  }

  const selectedOmr = selectReliableBaseline({
    beforePeriod: before?.valueOmr ?? null,
    firstInPeriod: firstInPeriod?.valueOmr ?? null,
    costBasis: costBasisOmr,
  });

  if (selectedOmr != null) {
    return { value: selectedOmr, currency: "OMR" };
  }

  // Non-public assets acquired during the period: acquisition cost is a valid opening mark.
  if (
    asset.category !== "PUBLIC_EQUITY" &&
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
