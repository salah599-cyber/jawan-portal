import { convertFromOmr, convertToOmr } from "@/lib/fx";
import { buildMuscatBullionOmrBoard, type MuscatBullionOmrBoard } from "@/lib/assets/prices/muscat-bullion-omr";
import { fetchSpotQuotesWithSource } from "@/lib/assets/prices/goldapi";
import { PRICE_SOURCE_MUSCAT_BULLION } from "@/lib/assets/precious-metals/constants";
import type {
  PreciousMetalPriceBasis,
  PreciousMetalType,
  PreciousMetalUnit,
} from "@/lib/generated/prisma/client";

export type ResolvedPreciousMetalPrice = {
  unitPrice: number;
  totalValue: number;
  priceSource: string;
  currency: string;
};

async function toAssetCurrency(amountOmr: number, currency: string) {
  if (currency === "OMR") return amountOmr;
  return convertFromOmr(amountOmr, currency);
}

async function usdToAssetCurrency(amountUsd: number, currency: string) {
  if (currency === "USD") return amountUsd;
  const amountOmr = await convertToOmr(amountUsd, "USD");
  return toAssetCurrency(amountOmr, currency);
}

function resolveOmrUnitPrice(
  metal: PreciousMetalType,
  unit: PreciousMetalUnit,
  basis: PreciousMetalPriceBasis,
  board: MuscatBullionOmrBoard,
): number {
  const useBuy = basis === "OMR_BUY";

  if (metal === "GOLD") {
    switch (unit) {
      case "GRAM":
        return useBuy ? board.goldPerGramBuy : board.goldPerGramSell;
      case "TOLA_10":
        return useBuy ? board.goldTenTolaBuy : board.goldTenTolaSell;
      default:
        throw new Error("Gold OMR pricing supports gram and 10 tola units.");
    }
  }

  switch (unit) {
    case "GRAM":
      return useBuy ? board.silverPerGramBuy : board.silverPerGramSell;
    case "KG":
      return useBuy ? board.silverKiloBuy : board.silverKiloSell;
    default:
      throw new Error("Silver OMR pricing supports gram and kilogram units.");
  }
}

function resolveUsdSpotPerOz(
  metal: PreciousMetalType,
  basis: PreciousMetalPriceBasis,
  board: MuscatBullionOmrBoard,
) {
  const useBuy = basis !== "OMR_SELL";
  if (metal === "GOLD") {
    return useBuy ? board.goldUsdBidPerOz : board.goldUsdAskPerOz;
  }
  return useBuy ? board.silverUsdBidPerOz : board.silverUsdAskPerOz;
}

export async function resolvePreciousMetalValuation(input: {
  metal: PreciousMetalType;
  unit: PreciousMetalUnit;
  quantity: number;
  priceBasis: PreciousMetalPriceBasis;
  currency: string;
  board?: MuscatBullionOmrBoard;
  priceSource?: string;
}): Promise<ResolvedPreciousMetalPrice> {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error("Quantity must be greater than zero.");
  }

  let board: MuscatBullionOmrBoard;
  let priceSource: string;

  if (input.board) {
    board = input.board;
    priceSource = input.priceSource ?? PRICE_SOURCE_MUSCAT_BULLION;
  } else {
    const fetched = await fetchMuscatBullionBoard();
    board = fetched.board;
    priceSource = fetched.priceSource;
  }

  if (input.priceBasis === "USD_SPOT_OZ" || input.unit === "OZ") {
    if (input.unit !== "OZ") {
      throw new Error("USD spot pricing is only available per troy ounce.");
    }

    const usdPerOz = resolveUsdSpotPerOz(input.metal, input.priceBasis, board);
    const totalValue = await usdToAssetCurrency(input.quantity * usdPerOz, input.currency);

    return {
      unitPrice: totalValue / input.quantity,
      totalValue,
      priceSource,
      currency: input.currency,
    };
  }

  const unitPriceOmr = resolveOmrUnitPrice(
    input.metal,
    input.unit,
    input.priceBasis,
    board,
  );
  const totalValue = await toAssetCurrency(input.quantity * unitPriceOmr, input.currency);

  return {
    unitPrice: totalValue / input.quantity,
    totalValue,
    priceSource,
    currency: input.currency,
  };
}

export async function fetchMuscatBullionBoard() {
  const { quotes, source } = await fetchSpotQuotesWithSource();
  return {
    board: buildMuscatBullionOmrBoard(quotes),
    priceSource: source,
  };
}
