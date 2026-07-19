import { db } from "@/lib/db";
import type { PublicMarket } from "@/lib/generated/prisma/client";

export async function findDuplicateManualEquity(
  entityId: string,
  market: PublicMarket,
  symbol: string,
  managedPortfolioId: string | null,
): Promise<{ id: string; symbol: string } | null> {
  const asset = await db.asset.findFirst({
    where: {
      entityId,
      category: "PUBLIC_EQUITY",
      status: { in: ["ACTIVE", "MONITOR"] },
    },
    select: { id: true },
  });

  if (!asset) return null;

  return db.publicEquityHolding.findFirst({
    where: {
      assetId: asset.id,
      market,
      symbol: symbol.toUpperCase(),
      managedPortfolioId,
      instrumentType: "EQUITY",
    },
    select: { id: true, symbol: true },
  });
}
