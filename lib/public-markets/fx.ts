import { db } from "@/lib/db";
import type { PublicMarket } from "@/lib/generated/prisma/client";
import { MARKET_CONFIG } from "@/lib/public-markets/constants";

/** Fallback FX rates to OMR when no FxRate row exists (1 unit of fromCurrency = rate OMR). */
const FALLBACK_RATES_TO_OMR: Record<string, number> = {
  OMR: 1,
  USD: 0.385,
  HKD: 0.049,
  CNY: 0.053,
  INR: 0.0046,
  GBP: 0.49,
  EUR: 0.42,
  SAR: 0.103,
  AED: 0.105,
  KWD: 1.25,
  BHD: 1.02,
  QAR: 0.106,
};

export async function getRateToOmr(fromCurrency: string): Promise<number> {
  const currency = fromCurrency.toUpperCase();
  if (currency === "OMR") return 1;

  const latest = await db.fxRate.findFirst({
    where: { fromCurrency: currency, toCurrency: "OMR" },
    orderBy: { effectiveAt: "desc" },
  });

  if (latest) {
    const rate = parseFloat(latest.rate.toString());
    if (!Number.isNaN(rate) && rate > 0) return rate;
  }

  return FALLBACK_RATES_TO_OMR[currency] ?? 1;
}

export async function convertToOmr(amount: number, fromCurrency: string): Promise<number> {
  const rate = await getRateToOmr(fromCurrency);
  return amount * rate;
}

export function getMarketCurrency(market: PublicMarket): string {
  return MARKET_CONFIG[market].currency;
}

export async function convertMarketValueToOmr(
  marketValue: number | null | undefined,
  currency: string,
): Promise<number> {
  if (marketValue == null || Number.isNaN(marketValue)) return 0;
  return convertToOmr(marketValue, currency);
}
