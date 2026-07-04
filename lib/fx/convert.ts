import { FALLBACK_RATES_TO_OMR } from "@/lib/fx/fallback-rates";

export function normalizeCurrency(currency: string): string {
  return currency.trim().toUpperCase();
}

export function getFallbackRateToOmr(fromCurrency: string): number {
  const currency = normalizeCurrency(fromCurrency);
  if (currency === "OMR") return 1;
  return FALLBACK_RATES_TO_OMR[currency] ?? 1;
}

export function convertFromOmrSync(
  amountOmr: number,
  toCurrency: string,
  ratesToOmr: Record<string, number>,
): number {
  const currency = normalizeCurrency(toCurrency);
  if (currency === "OMR") return amountOmr;

  const rate = ratesToOmr[currency] ?? getFallbackRateToOmr(currency);
  if (!rate || rate <= 0) return amountOmr;
  return amountOmr / rate;
}
