import { db } from "@/lib/db";
import { ensurePeSchema } from "@/lib/db/ensure-pe-schema";
import { getAssetCategoryKey } from "@/lib/assets/category-display";
import { listPeCompanies } from "@/lib/data/pe-portfolio";
import { canAccess, getModulePermission } from "@/lib/permissions/access";
import { assetEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";
import { applyPeCarryingDelta } from "@/lib/pe/portfolio-rollup";
import { buildCashGroups, isManagedCashAssetName, syncBankBalancesToCashAssets } from "@/lib/portfolio/cash-sync";
import { addUnlinkedPropertyMortgagesToMap } from "@/lib/portfolio/property-liabilities";
import { convertToOmr, entityWhere, weightedValue } from "@/lib/reports/helpers";

const COUNTABLE_ASSET_STATUSES = ["ACTIVE", "MONITOR"] as const;

export type CategoryMapEntry = {
  count: number;
  totals: Map<string, number>;
};

export type PortfolioRollup = {
  portfolioMap: Map<string, number>;
  liabilityMap: Map<string, number>;
  categoryMap: Map<string, CategoryMapEntry>;
  assetValuesById: Map<string, number>;
  portfolioTotalOmr: number;
  liabilityTotalOmr: number;
  netWorthTotalOmr: number;
  assetCount: number;
  activeAssetCount: number;
};

function addToCurrencyMap(map: Map<string, number>, currency: string, amount: number) {
  if (amount <= 0 || Number.isNaN(amount)) return;
  map.set(currency, (map.get(currency) ?? 0) + amount);
}

async function consolidateMapToOmr(map: Map<string, number>): Promise<number> {
  let total = 0;
  for (const [currency, amount] of map.entries()) {
    if (amount <= 0) continue;
    total += await convertToOmr(amount, currency);
  }
  return total;
}

function liabilityEntityFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "ASSETS");
  if (level === "FULL" || level === "READ") return {};
  if (level === "FILTERED") return { entityId: { in: ctx.entityIds } };
  return { id: "__none__" };
}

export type PortfolioRollupOptions = {
  entityId?: string;
};

export async function getPortfolioRollup(
  ctx: UserContext,
  options: PortfolioRollupOptions = {},
): Promise<PortfolioRollup> {
  const portfolioMap = new Map<string, number>();
  const liabilityMap = new Map<string, number>();
  const categoryMap = new Map<string, CategoryMapEntry>();
  const assetValuesById = new Map<string, number>();

  if (!canAccess(ctx, "ASSETS")) {
    return {
      portfolioMap,
      liabilityMap,
      categoryMap,
      assetValuesById,
      portfolioTotalOmr: 0,
      liabilityTotalOmr: 0,
      netWorthTotalOmr: 0,
      assetCount: 0,
      activeAssetCount: 0,
    };
  }

  if (canAccess(ctx, "CASH_MANAGEMENT")) {
    await syncBankBalancesToCashAssets(ctx);
  }

  const bankCashGroups = canAccess(ctx, "CASH_MANAGEMENT") ? await buildCashGroups(ctx) : [];
  const bankCashKeys = new Set(bankCashGroups.map((group) => `${group.entityId}:${group.currency}`));

  const assets = await db.asset.findMany({
    where: {
      ...entityWhere(options.entityId, assetEntityFilter(ctx)),
      status: { in: [...COUNTABLE_ASSET_STATUSES] },
    },
    select: {
      id: true,
      name: true,
      entityId: true,
      category: true,
      assetType: { select: { name: true } },
      status: true,
      currentValue: true,
      currency: true,
      ownershipPct: true,
    },
  });

  const assetOwnershipPctById = new Map<string, number>();

  for (const asset of assets) {
    const ownershipPct = parseFloat(asset.ownershipPct.toString());
    assetOwnershipPctById.set(asset.id, Number.isNaN(ownershipPct) ? 100 : ownershipPct);

    if (
      asset.category === "CASH" &&
      isManagedCashAssetName(asset.name) &&
      bankCashKeys.has(`${asset.entityId}:${asset.currency}`)
    ) {
      continue;
    }

    const value = weightedValue(asset.currentValue, asset.ownershipPct);
    assetValuesById.set(asset.id, value);
    addToCurrencyMap(portfolioMap, asset.currency, value);

    const categoryKey = getAssetCategoryKey(asset);
    const entry = categoryMap.get(categoryKey) ?? { count: 0, totals: new Map<string, number>() };
    entry.count += 1;
    addToCurrencyMap(entry.totals, asset.currency, value);
    categoryMap.set(categoryKey, entry);
  }

  for (const group of bankCashGroups) {
    addToCurrencyMap(portfolioMap, group.currency, group.totalBalance);

    const categoryKey = "CASH";
    const entry = categoryMap.get(categoryKey) ?? { count: 0, totals: new Map<string, number>() };
    entry.count += 1;
    addToCurrencyMap(entry.totals, group.currency, group.totalBalance);
    categoryMap.set(categoryKey, entry);
  }

  if (canAccess(ctx, "PRIVATE_EQUITY")) {
    await ensurePeSchema();
    const peCompanies = await listPeCompanies(ctx, options.entityId);
    applyPeCarryingDelta(peCompanies, assetValuesById, assetOwnershipPctById, (currency, delta) => {
      addToCurrencyMap(portfolioMap, currency, delta);

      const categoryKey = "PRIVATE_EQUITY";
      const entry = categoryMap.get(categoryKey) ?? { count: 0, totals: new Map<string, number>() };
      addToCurrencyMap(entry.totals, currency, delta);
      categoryMap.set(categoryKey, entry);
    });
  }

  const liabilities = await db.liability.findMany({
    where: {
      ...entityWhere(options.entityId, liabilityEntityFilter(ctx)),
      status: "ACTIVE",
    },
    select: { amount: true, outstandingBalance: true, currency: true },
  });

  for (const liability of liabilities) {
    const balance = liability.outstandingBalance ?? liability.amount;
    const parsed = parseFloat(balance.toString());
    addToCurrencyMap(liabilityMap, liability.currency, parsed);
  }

  await addUnlinkedPropertyMortgagesToMap(ctx, liabilityMap, options.entityId);

  const portfolioTotalOmr = await consolidateMapToOmr(portfolioMap);
  const liabilityTotalOmr = await consolidateMapToOmr(liabilityMap);

  return {
    portfolioMap,
    liabilityMap,
    categoryMap,
    assetValuesById,
    portfolioTotalOmr,
    liabilityTotalOmr,
    netWorthTotalOmr: portfolioTotalOmr - liabilityTotalOmr,
    assetCount: assets.length,
    activeAssetCount: assets.filter((asset) => asset.status === "ACTIVE").length,
  };
}
