import { db } from "@/lib/db";
import { ensurePreciousMetalsSchema } from "@/lib/db/ensure-precious-metals-schema";
import { fetchMuscatBullionBoard } from "@/lib/assets/prices/resolve-precious-metal-price";
import { resolvePreciousMetalValuation } from "@/lib/assets/prices/resolve-precious-metal-price";
import { recordAssetValuation } from "@/lib/portfolio/valuations";

export type PreciousMetalRefreshResult = {
  scanned: number;
  updated: number;
  failed: number;
  assetIds: string[];
};

function toNumber(value: { toString(): string } | number | null | undefined) {
  if (value == null) return 0;
  const num = typeof value === "number" ? value : parseFloat(value.toString());
  return Number.isNaN(num) ? 0 : num;
}

export async function refreshPreciousMetalPrices(assetId?: string): Promise<PreciousMetalRefreshResult> {
  await ensurePreciousMetalsSchema();

  const assets = await db.asset.findMany({
    where: {
      category: "PRECIOUS_METALS",
      status: { not: "EXITED" },
      preciousMetal: { isNot: null },
      ...(assetId ? { id: assetId } : {}),
    },
    include: {
      preciousMetal: true,
    },
  });

  const result: PreciousMetalRefreshResult = {
    scanned: assets.length,
    updated: 0,
    failed: 0,
    assetIds: [],
  };

  if (assets.length === 0) {
    return result;
  }

  const board = await fetchMuscatBullionBoard();
  const now = new Date();

  for (const asset of assets) {
    const detail = asset.preciousMetal;
    if (!detail) {
      result.failed += 1;
      continue;
    }

    try {
      const quantity = toNumber(detail.quantity);
      const valuation = await resolvePreciousMetalValuation({
        metal: detail.metal,
        unit: detail.unit,
        quantity,
        priceBasis: detail.priceBasis,
        currency: asset.currency,
        board,
      });

      await db.$transaction([
        db.preciousMetalDetail.update({
          where: { id: detail.id },
          data: {
            lastUnitPrice: valuation.unitPrice.toFixed(6),
            priceFetchedAt: now,
            priceSource: valuation.priceSource,
          },
        }),
        db.asset.update({
          where: { id: asset.id },
          data: {
            currentValue: valuation.totalValue.toFixed(2),
            valueUpdatedAt: now,
          },
        }),
      ]);

      await recordAssetValuation({
        assetId: asset.id,
        value: valuation.totalValue,
        currency: asset.currency,
      });

      result.updated += 1;
      result.assetIds.push(asset.id);
    } catch (error) {
      console.error(`Failed to refresh precious metal asset ${asset.id}:`, error);
      result.failed += 1;
    }
  }

  return result;
}
