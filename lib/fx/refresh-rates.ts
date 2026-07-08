import { db } from "@/lib/db";
import { fetchYahooFxRates } from "@/lib/fx/yahoo";

export type FxRefreshResult = {
  updated: number;
  failed: number;
  currencies: string[];
};

export async function refreshFxRatesFromYahoo(): Promise<FxRefreshResult> {
  const quotes = await fetchYahooFxRates();
  const effectiveAt = new Date();
  let updated = 0;
  let failed = 0;
  const currencies: string[] = [];

  for (const quote of quotes) {
    try {
      await db.fxRate.create({
        data: {
          fromCurrency: quote.fromCurrency,
          toCurrency: quote.toCurrency,
          rate: quote.rate.toString(),
          effectiveAt,
        },
      });
      updated += 1;
      currencies.push(quote.fromCurrency);
    } catch {
      failed += 1;
    }
  }

  return { updated, failed, currencies };
}
