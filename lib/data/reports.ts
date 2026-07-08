import { db } from "@/lib/db";
import { canAccess, getModulePermission } from "@/lib/permissions/access";
import { assetEntityFilter, expenseEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";
import { ASSET_CATEGORY_LABELS } from "@/lib/labels";
import type { CurrencyTotal } from "@/lib/data/dashboard";

export type EntityBreakdownRow = {
  entityId: string;
  entityName: string;
  assetCount: number;
  assetTotals: CurrencyTotal[];
  liabilityTotals: CurrencyTotal[];
  netTotals: CurrencyTotal[];
};

export type CategoryReportRow = {
  category: string;
  label: string;
  count: number;
  totals: CurrencyTotal[];
};

export type ExpenseStatusRow = {
  status: string;
  count: number;
  totals: CurrencyTotal[];
};

export type ReportsSummary = {
  canViewFinancials: boolean;
  entityBreakdown: EntityBreakdownRow[];
  categoryBreakdown: CategoryReportRow[];
  expenseByStatus: ExpenseStatusRow[];
  totalAssetTotals: CurrencyTotal[];
  totalLiabilityTotals: CurrencyTotal[];
  totalNetTotals: CurrencyTotal[];
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

function addToCurrencyMap(map: Map<string, number>, currency: string, amount: number) {
  if (amount === 0) return;
  map.set(currency, (map.get(currency) ?? 0) + amount);
}

function mapToTotals(map: Map<string, number>): CurrencyTotal[] {
  return [...map.entries()]
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

function netTotals(assets: CurrencyTotal[], liabilities: CurrencyTotal[]): CurrencyTotal[] {
  const map = new Map<string, number>();
  for (const t of assets) map.set(t.currency, (map.get(t.currency) ?? 0) + t.amount);
  for (const t of liabilities) map.set(t.currency, (map.get(t.currency) ?? 0) - t.amount);
  return mapToTotals(map);
}

function liabilityEntityFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "ASSETS");
  if (level === "FULL" || level === "READ") return {};
  if (level === "FILTERED") return { entityId: { in: ctx.entityIds } };
  return { id: "__none__" };
}

export async function getReportsSummary(ctx: UserContext): Promise<ReportsSummary> {
  const canViewFinancials = canAccess(ctx, "ASSETS");

  const entityMap = new Map<
    string,
    { entityName: string; assetCount: number; assetTotals: Map<string, number>; liabilityTotals: Map<string, number> }
  >();
  const categoryMap = new Map<string, { count: number; totals: Map<string, number> }>();

  if (canViewFinancials) {
    const assets = await db.asset.findMany({
      where: { ...assetEntityFilter(ctx), status: { in: ["ACTIVE", "MONITOR"] } },
      select: {
        category: true,
        currentValue: true,
        currency: true,
        ownershipPct: true,
        entity: { select: { id: true, name: true } },
      },
    });

    for (const asset of assets) {
      const value = weightedValue(asset.currentValue, asset.ownershipPct);

      const entityEntry =
        entityMap.get(asset.entity.id) ??
        {
          entityName: asset.entity.name,
          assetCount: 0,
          assetTotals: new Map<string, number>(),
          liabilityTotals: new Map<string, number>(),
        };
      entityEntry.assetCount += 1;
      addToCurrencyMap(entityEntry.assetTotals, asset.currency, value);
      entityMap.set(asset.entity.id, entityEntry);

      const categoryEntry = categoryMap.get(asset.category) ?? { count: 0, totals: new Map<string, number>() };
      categoryEntry.count += 1;
      addToCurrencyMap(categoryEntry.totals, asset.currency, value);
      categoryMap.set(asset.category, categoryEntry);
    }

    const liabilities = await db.liability.findMany({
      where: { ...liabilityEntityFilter(ctx), status: "ACTIVE" },
      select: {
        amount: true,
        outstandingBalance: true,
        currency: true,
        entity: { select: { id: true, name: true } },
      },
    });

    for (const liability of liabilities) {
      const balance = parseFloat((liability.outstandingBalance ?? liability.amount).toString());
      const entityEntry =
        entityMap.get(liability.entity.id) ??
        {
          entityName: liability.entity.name,
          assetCount: 0,
          assetTotals: new Map<string, number>(),
          liabilityTotals: new Map<string, number>(),
        };
      addToCurrencyMap(entityEntry.liabilityTotals, liability.currency, balance);
      entityMap.set(liability.entity.id, entityEntry);
    }
  }

  let expenseByStatus: ExpenseStatusRow[] = [];
  if (canAccess(ctx, "EXPENSES")) {
    const expenses = await db.expense.findMany({
      where: expenseEntityFilter(ctx),
      select: { status: true, amount: true, currency: true },
    });

    const statusMap = new Map<string, { count: number; totals: Map<string, number> }>();
    for (const expense of expenses) {
      const entry = statusMap.get(expense.status) ?? { count: 0, totals: new Map<string, number>() };
      entry.count += 1;
      addToCurrencyMap(entry.totals, expense.currency, parseFloat(expense.amount.toString()));
      statusMap.set(expense.status, entry);
    }
    expenseByStatus = [...statusMap.entries()]
      .map(([status, data]) => ({ status, count: data.count, totals: mapToTotals(data.totals) }))
      .sort((a, b) => a.status.localeCompare(b.status));
  }

  const entityBreakdown: EntityBreakdownRow[] = [...entityMap.entries()]
    .map(([entityId, data]) => {
      const assetTotals = mapToTotals(data.assetTotals);
      const liabilityTotals = mapToTotals(data.liabilityTotals);
      return {
        entityId,
        entityName: data.entityName,
        assetCount: data.assetCount,
        assetTotals,
        liabilityTotals,
        netTotals: netTotals(assetTotals, liabilityTotals),
      };
    })
    .sort((a, b) => a.entityName.localeCompare(b.entityName));

  const totalAssetTotals = mapToTotals(
    entityBreakdown.reduce((map, row) => {
      for (const t of row.assetTotals) map.set(t.currency, (map.get(t.currency) ?? 0) + t.amount);
      return map;
    }, new Map<string, number>()),
  );
  const totalLiabilityTotals = mapToTotals(
    entityBreakdown.reduce((map, row) => {
      for (const t of row.liabilityTotals) map.set(t.currency, (map.get(t.currency) ?? 0) + t.amount);
      return map;
    }, new Map<string, number>()),
  );

  return {
    canViewFinancials,
    entityBreakdown,
    categoryBreakdown: [...categoryMap.entries()]
      .map(([category, data]) => ({
        category,
        label: ASSET_CATEGORY_LABELS[category] ?? category,
        count: data.count,
        totals: mapToTotals(data.totals),
      }))
      .sort((a, b) => {
        const aTotal = a.totals.reduce((sum, t) => sum + t.amount, 0);
        const bTotal = b.totals.reduce((sum, t) => sum + t.amount, 0);
        return bTotal - aTotal;
      }),
    expenseByStatus,
    totalAssetTotals,
    totalLiabilityTotals,
    totalNetTotals: netTotals(totalAssetTotals, totalLiabilityTotals),
  };
}
