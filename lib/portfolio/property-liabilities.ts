import { db } from "@/lib/db";
import { ensureRealEstateSchema } from "@/lib/db/ensure-real-estate-schema";
import { canAccess } from "@/lib/permissions/access";
import { rePropertyEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";
import { convertToOmr, entityWhere } from "@/lib/reports/helpers";

function addToCurrencyMap(map: Map<string, number>, currency: string, amount: number) {
  if (amount <= 0 || Number.isNaN(amount)) return;
  map.set(currency, (map.get(currency) ?? 0) + amount);
}

/**
 * Property mortgage balances entered on a real-estate record without a linked
 * loan liability are still owed and must reduce net worth.
 */
export async function addUnlinkedPropertyMortgagesToMap(
  ctx: UserContext,
  liabilityMap: Map<string, number>,
  entityId?: string,
): Promise<void> {
  if (!canAccess(ctx, "REAL_ESTATE")) return;

  try {
    await ensureRealEstateSchema();
  } catch {
    return;
  }

  const properties = await db.reProperty.findMany({
    where: {
      ...entityWhere(entityId, rePropertyEntityFilter(ctx)),
      status: { not: "SOLD" },
      liabilityId: null,
      mortgageOutstandingOmr: { not: null },
    },
    select: { mortgageOutstandingOmr: true },
  });

  for (const property of properties) {
    const balance = parseFloat(property.mortgageOutstandingOmr!.toString());
    addToCurrencyMap(liabilityMap, "OMR", balance);
  }
}

export async function getUnlinkedPropertyMortgageTotalOmr(
  ctx: UserContext,
  entityId?: string,
): Promise<number> {
  const liabilityMap = new Map<string, number>();
  await addUnlinkedPropertyMortgagesToMap(ctx, liabilityMap, entityId);

  let total = 0;
  for (const [currency, amount] of liabilityMap.entries()) {
    if (amount <= 0) continue;
    total += await convertToOmr(amount, currency);
  }
  return total;
}
