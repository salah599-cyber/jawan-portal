import { db } from "@/lib/db";
import { DISPLAY_CURRENCIES } from "@/lib/fx/constants";
import {
  convertFromOmrSync,
  getFallbackRateToOmr,
  normalizeCurrency,
} from "@/lib/fx/convert";

export { FALLBACK_RATES_TO_OMR } from "@/lib/fx/fallback-rates";
export { convertFromOmrSync, getFallbackRateToOmr, normalizeCurrency };

export async function getRateToOmr(fromCurrency: string): Promise<number> {
  const currency = normalizeCurrency(fromCurrency);
  if (currency === "OMR") return 1;

  const latest = await db.fxRate.findFirst({
    where: { fromCurrency: currency, toCurrency: "OMR" },
    orderBy: { effectiveAt: "desc" },
  });

  if (latest) {
    const rate = parseFloat(latest.rate.toString());
    if (!Number.isNaN(rate) && rate > 0) return rate;
  }

  return getFallbackRateToOmr(currency);
}

export async function convertToOmr(amount: number, fromCurrency: string): Promise<number> {
  const rate = await getRateToOmr(fromCurrency);
  return amount * rate;
}

export async function convertFromOmr(amountOmr: number, toCurrency: string): Promise<number> {
  const currency = normalizeCurrency(toCurrency);
  if (currency === "OMR") return amountOmr;

  const rate = await getRateToOmr(currency);
  if (!rate || rate <= 0) return amountOmr;
  return amountOmr / rate;
}

export async function getRatesToOmr(
  currencies: string[] = [...DISPLAY_CURRENCIES],
): Promise<Record<string, number>> {
  const unique = [...new Set(currencies.map(normalizeCurrency).filter((c) => c !== "OMR"))];
  const rates: Record<string, number> = { OMR: 1 };

  await Promise.all(
    unique.map(async (currency) => {
      rates[currency] = await getRateToOmr(currency);
    }),
  );

  return rates;
}

export async function getLatestFxUpdatedAt(): Promise<Date | null> {
  const latest = await db.fxRate.findFirst({
    where: { toCurrency: "OMR" },
    orderBy: { effectiveAt: "desc" },
    select: { effectiveAt: true },
  });

  return latest?.effectiveAt ?? null;
}
