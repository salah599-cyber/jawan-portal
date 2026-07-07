import type { SpotQuotes } from "@/lib/assets/prices/goldapi";

export type MuscatBullionOmrBoard = {
  goldPerGramBuy: number;
  goldPerGramSell: number;
  goldTenTolaBuy: number;
  goldTenTolaSell: number;
  silverPerGramBuy: number;
  silverPerGramSell: number;
  silverKiloBuy: number;
  silverKiloSell: number;
  goldUsdBidPerOz: number;
  goldUsdAskPerOz: number;
  silverUsdBidPerOz: number;
  silverUsdAskPerOz: number;
};

const GOLD_ASK_PREMIUM_USD = 1.56;
const SILVER_ASK_PREMIUM_USD = 0.15;
const GOLD_OMR_MULTIPLIER = 1.4485;
const SILVER_OMR_MULTIPLIER = 13.5;
const GOLD_TOLA_GRAMS = 116.64;

const ADJUSTMENTS = {
  goldTolaBuy: -120,
  silverKiloBuy: -65,
  goldTolaSell: 25,
  silverKiloSell: 0,
};

export function buildMuscatBullionOmrBoard(quotes: SpotQuotes): MuscatBullionOmrBoard {
  const goldUsdBidPerOz = quotes.gold.bid;
  const goldUsdAskPerOz = quotes.gold.ask ?? goldUsdBidPerOz + GOLD_ASK_PREMIUM_USD;
  const silverUsdBidPerOz = quotes.silver.bid;
  const silverUsdAskPerOz = quotes.silver.ask ?? silverUsdBidPerOz + SILVER_ASK_PREMIUM_USD;

  const goldTenTolaBuy = goldUsdBidPerOz * GOLD_OMR_MULTIPLIER + ADJUSTMENTS.goldTolaBuy;
  const goldPerGramBuy = goldTenTolaBuy / GOLD_TOLA_GRAMS;
  const silverKiloBuy = silverUsdBidPerOz * SILVER_OMR_MULTIPLIER + ADJUSTMENTS.silverKiloBuy;
  const silverPerGramBuy = silverKiloBuy / 1000;

  const goldTenTolaSell = goldUsdAskPerOz * GOLD_OMR_MULTIPLIER + ADJUSTMENTS.goldTolaSell;
  const goldPerGramSell = goldTenTolaSell / GOLD_TOLA_GRAMS;
  const silverKiloSell = silverUsdAskPerOz * SILVER_OMR_MULTIPLIER + ADJUSTMENTS.silverKiloSell;
  const silverPerGramSell = silverKiloSell / 1000;

  return {
    goldPerGramBuy,
    goldPerGramSell,
    goldTenTolaBuy,
    goldTenTolaSell,
    silverPerGramBuy,
    silverPerGramSell,
    silverKiloBuy,
    silverKiloSell,
    goldUsdBidPerOz,
    goldUsdAskPerOz,
    silverUsdBidPerOz,
    silverUsdAskPerOz,
  };
}
