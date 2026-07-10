import { db } from "@/lib/db";
import { ensurePeSchema } from "@/lib/db/ensure-pe-schema";
import { ensureExitRoiSchema } from "@/lib/db/ensure-exit-roi-schema";
import { ensureExitSettlementSchema } from "@/lib/db/ensure-exit-settlement-schema";
import { getAssetLinkedModule } from "@/lib/assets/linked-module";
import { ASSET_CATEGORY_LABELS, EXIT_TYPE_LABELS, PE_EXIT_TYPE_LABELS } from "@/lib/labels";
import { assetEntityFilter, peCompanyEntityFilter } from "@/lib/permissions/scoped-queries";
import { getRatesToOmr } from "@/lib/fx";
import type { UserContext } from "@/lib/permissions/types";

export type UnifiedExitSource = "ASSET" | "PRIVATE_EQUITY" | "REAL_ESTATE";

export type UnifiedExitRecord = {
  id: string;
  source: UnifiedExitSource;
  name: string;
  entityName: string;
  category: string;
  exitType: string;
  exitDate: Date;
  currency: string;
  proceedsNative: number | null;
  realizedGainNative: number | null;
  proceedsOmr: number | null;
  costBasisOmr: number | null;
  realizedGainOmr: number | null;
  roiPct: number | null;
  href: string;
  settlementStatus: "PENDING" | "SETTLED" | "NONE" | null;
  settledBankLabel: string | null;
  assetExitId: string | null;
};

export type ExitAnalyticsCategoryBreakdown = {
  category: string;
  count: number;
  gainOmr: number;
  avgRoiPct: number | null;
};

export type ExitAnalyticsSummary = {
  exitCount: number;
  totalProceedsOmr: number;
  totalRealizedGainOmr: number;
  averageRoiPct: number | null;
  winRatePct: number | null;
  byCategory: ExitAnalyticsCategoryBreakdown[];
};

export type ExitAnalyticsParams = {
  entityId?: string;
  from?: Date;
  to?: Date;
};

function toNum(value: { toString(): string } | number | null | undefined): number | null {
  if (value == null) return null;
  const num = typeof value === "number" ? value : parseFloat(value.toString());
  return Number.isNaN(num) ? null : num;
}

function exitDateWhere(params: ExitAnalyticsParams) {
  if (!params.from && !params.to) return {};
  return {
    exitDate: {
      ...(params.from ? { gte: params.from } : {}),
      ...(params.to ? { lte: params.to } : {}),
    },
  };
}

const assetExitInclude = {
  asset: {
    select: {
      id: true,
      name: true,
      category: true,
      entity: { select: { name: true } },
      landParcel: { select: { id: true } },
      vehicle: { select: { id: true } },
      registeredCompany: { select: { id: true } },
      peCompany: { select: { id: true } },
      lpCommitment: { select: { id: true } },
      reProperty: { select: { id: true } },
    },
  },
} as const;

async function fetchAssetExits(ctx: UserContext, params: ExitAnalyticsParams) {
  return db.assetExit.findMany({
    where: {
      ...exitDateWhere(params),
      asset: {
        ...assetEntityFilter(ctx),
        ...(params.entityId ? { entityId: params.entityId } : {}),
      },
    },
    include: {
      ...assetExitInclude,
      settledBankAccount: { select: { bankName: true, accountName: true } },
    },
    orderBy: { exitDate: "desc" },
  });
}

async function fetchPeExits(ctx: UserContext, params: ExitAnalyticsParams) {
  return db.peExit.findMany({
    where: {
      ...exitDateWhere(params),
      company: {
        ...peCompanyEntityFilter(ctx),
        ...(params.entityId ? { entityId: params.entityId } : {}),
      },
    },
    include: { company: { select: { id: true, name: true, reportingCurrency: true, entity: { select: { name: true } } } } },
    orderBy: { exitDate: "desc" },
  });
}

/**
 * Unified exit records across asset exits (cars, companies, lands, standalone
 * assets, and real estate sales — all recorded via AssetExit) and private
 * equity exits (PeExit). Amounts are normalized to OMR for aggregation.
 */
export async function getUnifiedExits(
  ctx: UserContext,
  params: ExitAnalyticsParams = {},
): Promise<UnifiedExitRecord[]> {
  await ensureExitRoiSchema();
  await ensureExitSettlementSchema();
  await ensurePeSchema();

  const [assetExits, peExits] = await Promise.all([
    fetchAssetExits(ctx, params),
    fetchPeExits(ctx, params),
  ]);

  const currencies = new Set<string>();
  for (const exit of assetExits) currencies.add(exit.currency);
  for (const exit of peExits) currencies.add(exit.company.reportingCurrency);
  const rates = await getRatesToOmr([...currencies]);
  const rateFor = (currency: string) => rates[currency.toUpperCase()] ?? 1;

  const assetRecords: UnifiedExitRecord[] = assetExits.map((exit) => {
    const rate = rateFor(exit.currency);
    const proceeds = toNum(exit.proceeds);
    const costBasis = toNum(exit.acquisitionCost);
    const realizedGain = toNum(exit.realizedGain);
    const isRealEstate = Boolean(exit.asset.reProperty);
    const linked = getAssetLinkedModule(exit.asset);

    return {
      id: exit.id,
      source: isRealEstate ? "REAL_ESTATE" : "ASSET",
      name: exit.asset.name,
      entityName: exit.asset.entity.name,
      category: ASSET_CATEGORY_LABELS[exit.asset.category] ?? exit.asset.category,
      exitType: EXIT_TYPE_LABELS[exit.exitType] ?? exit.exitType,
      exitDate: exit.exitDate,
      currency: exit.currency,
      proceedsNative: proceeds,
      realizedGainNative: realizedGain,
      proceedsOmr: proceeds != null ? proceeds * rate : null,
      costBasisOmr: costBasis != null ? costBasis * rate : null,
      realizedGainOmr: realizedGain != null ? realizedGain * rate : null,
      roiPct: toNum(exit.realizedGainPct),
      href: linked?.href ?? `/assets/${exit.asset.id}`,
      settlementStatus: exit.settlementStatus,
      settledBankLabel: exit.settledBankAccount
        ? `${exit.settledBankAccount.bankName} — ${exit.settledBankAccount.accountName}`
        : null,
      assetExitId: exit.id,
    };
  });

  const peRecords: UnifiedExitRecord[] = peExits.map((exit) => {
    const rate = rateFor(exit.company.reportingCurrency);
    const proceeds = toNum(exit.exitProceedsReporting);
    const costBasis = toNum(exit.totalInvestedSnapshot);
    const realizedGain = toNum(exit.realisedGainLossReporting);

    return {
      id: exit.id,
      source: "PRIVATE_EQUITY",
      name: exit.company.name,
      entityName: exit.company.entity.name,
      category: "Private Equity",
      exitType: PE_EXIT_TYPE_LABELS[exit.exitType] ?? exit.exitType,
      exitDate: exit.exitDate,
      currency: exit.company.reportingCurrency,
      proceedsNative: proceeds,
      realizedGainNative: realizedGain,
      proceedsOmr: proceeds != null ? proceeds * rate : null,
      costBasisOmr: costBasis != null ? costBasis * rate : null,
      realizedGainOmr: realizedGain != null ? realizedGain * rate : null,
      roiPct: toNum(exit.realizedGainPct),
      href: `/portfolio/pe/${exit.company.id}`,
      settlementStatus: null,
      settledBankLabel: null,
      assetExitId: null,
    };
  });

  return [...assetRecords, ...peRecords].sort(
    (a, b) => b.exitDate.getTime() - a.exitDate.getTime(),
  );
}

export function summarizeExits(records: UnifiedExitRecord[]): ExitAnalyticsSummary {
  const exitCount = records.length;
  const totalProceedsOmr = records.reduce((sum, r) => sum + (r.proceedsOmr ?? 0), 0);
  const totalRealizedGainOmr = records.reduce((sum, r) => sum + (r.realizedGainOmr ?? 0), 0);

  const roiValues = records.map((r) => r.roiPct).filter((v): v is number => v != null);
  const averageRoiPct =
    roiValues.length > 0 ? roiValues.reduce((sum, v) => sum + v, 0) / roiValues.length : null;

  const gainRecords = records.filter((r) => r.realizedGainOmr != null);
  const winRatePct =
    gainRecords.length > 0
      ? (gainRecords.filter((r) => (r.realizedGainOmr ?? 0) > 0).length / gainRecords.length) * 100
      : null;

  const byCategoryMap = new Map<string, { count: number; gainOmr: number; roiValues: number[] }>();
  for (const record of records) {
    const entry = byCategoryMap.get(record.category) ?? { count: 0, gainOmr: 0, roiValues: [] };
    entry.count += 1;
    entry.gainOmr += record.realizedGainOmr ?? 0;
    if (record.roiPct != null) entry.roiValues.push(record.roiPct);
    byCategoryMap.set(record.category, entry);
  }

  const byCategory: ExitAnalyticsCategoryBreakdown[] = [...byCategoryMap.entries()]
    .map(([category, entry]) => ({
      category,
      count: entry.count,
      gainOmr: entry.gainOmr,
      avgRoiPct:
        entry.roiValues.length > 0
          ? entry.roiValues.reduce((sum, v) => sum + v, 0) / entry.roiValues.length
          : null,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    exitCount,
    totalProceedsOmr,
    totalRealizedGainOmr,
    averageRoiPct,
    winRatePct,
    byCategory,
  };
}

export async function getExitAnalyticsSummary(
  ctx: UserContext,
  params: ExitAnalyticsParams = {},
): Promise<ExitAnalyticsSummary> {
  const records = await getUnifiedExits(ctx, params);
  return summarizeExits(records);
}
