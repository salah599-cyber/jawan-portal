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
  error?: string;
};

function toNumber(value: { toString(): string } | number | null | undefined) {
  if (value == null) return 0;
  const num = typeof value === "number" ? value : parseFloat(value.toString());
  return Number.isNaN(num) ? 0 : num;
}

function formatError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function refreshPreciousMetalPrices(
  assetId?: string,
): Promise<PreciousMetalRefreshResult> {
  const result: PreciousMetalRefreshResult = {
    scanned: 0,
    updated: 0,
    failed: 0,
    assetIds: [],
  };

  try {
    await ensurePreciousMetalsSchema();
  } catch (error) {
    result.error = formatError(error, "Precious metals schema is not available.");
    return result;
  }

  let assets: Array<{
    id: string;
    currency: string;
    preciousMetal: {
      id: string;
      metal: "GOLD" | "SILVER";
      unit: "GRAM" | "TOLA_10" | "KG" | "OZ";
      quantity: { toString(): string };
      priceBasis: "OMR_BUY" | "OMR_SELL" | "USD_SPOT_OZ";
    } | null;
  }>;
  try {
    assets = await db.asset.findMany({
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
  } catch (error) {
    console.error("refreshPreciousMetalPrices load failed:", error);
    result.error = formatError(error, "Could not load gold/silver assets.");
    return result;
  }

  result.scanned = assets.length;
  if (assets.length === 0) {
    return result;
  }

  let boardBundle: Awaited<ReturnType<typeof fetchMuscatBullionBoard>>;
  try {
    boardBundle = await fetchMuscatBullionBoard();
  } catch (error) {
    console.error("refreshPreciousMetalPrices price fetch failed:", error);
    result.failed = assets.length;
    result.error = formatError(
      error,
      "Could not fetch live gold/silver prices. Try again later or add GOLD_API_KEY in Vercel.",
    );
    return result;
  }

  const { board, priceSource } = boardBundle;

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
        priceSource,
      });

      if (!Number.isFinite(valuation.unitPrice) || !Number.isFinite(valuation.totalValue)) {
        throw new Error("Price calculation returned an invalid value.");
      }

      await db.$transaction(async (tx) => {
        await tx.preciousMetalDetail.update({
          where: { id: detail.id },
          data: {
            lastUnitPrice: valuation.unitPrice.toFixed(6),
            priceFetchedAt: now,
            priceSource: valuation.priceSource,
          },
        });
        await tx.asset.update({
          where: { id: asset.id },
          data: {
            currentValue: valuation.totalValue.toFixed(2),
            valueUpdatedAt: now,
          },
        });
      });

      await recordAssetValuation({
        assetId: asset.id,
        value: valuation.totalValue,
        currency: asset.currency,
      }).catch(() => null);

      result.updated += 1;
      result.assetIds.push(asset.id);
    } catch (error) {
      console.error(`Failed to refresh precious metal asset ${asset.id}:`, error);
      result.failed += 1;
    }
  }

  if (result.updated === 0 && result.failed > 0 && !result.error) {
    result.error =
      "No gold/silver holdings were updated. Check GOLD_API_KEY, units, and price basis settings.";
  }

  return result;
}
