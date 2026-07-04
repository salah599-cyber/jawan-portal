import {
  DISPLAY_CURRENCIES,
  type DisplayCurrency,
  YAHOO_DIRECT_OMR_PAIRS,
  YAHOO_USD_CROSS_PAIRS,
  YAHOO_USD_OMR_PAIR,
} from "@/lib/fx/constants";

const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const USER_AGENT =
  "Mozilla/5.0 (compatible; JawanPortal/1.0; +https://github.com/salah599-cyber/jawan-portal)";

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
      };
    }>;
  };
};

async function fetchYahooChartPrice(symbol: string): Promise<number | null> {
  const url = `${YAHOO_CHART_URL}/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as YahooChartResponse;
  const price = payload.chart?.result?.[0]?.meta?.regularMarketPrice;

  if (price == null || Number.isNaN(price) || price <= 0) {
    return null;
  }

  return price;
}

export type YahooFxRate = {
  fromCurrency: DisplayCurrency;
  toCurrency: "OMR";
  rate: number;
};

export async function fetchYahooFxRates(): Promise<YahooFxRate[]> {
  const usdToOmr = await fetchYahooChartPrice(YAHOO_USD_OMR_PAIR);
  const rates: YahooFxRate[] = [];

  for (const currency of DISPLAY_CURRENCIES) {
    const directPair = YAHOO_DIRECT_OMR_PAIRS[currency];
    if (directPair) {
      const rate = await fetchYahooChartPrice(directPair);
      if (rate != null) {
        rates.push({ fromCurrency: currency, toCurrency: "OMR", rate });
      }
      continue;
    }

    const crossPair = YAHOO_USD_CROSS_PAIRS[currency];
    if (crossPair && usdToOmr != null) {
      const unitsPerUsd = await fetchYahooChartPrice(crossPair);
      if (unitsPerUsd != null && unitsPerUsd > 0) {
        rates.push({
          fromCurrency: currency,
          toCurrency: "OMR",
          rate: usdToOmr / unitsPerUsd,
        });
      }
    }
  }

  return rates;
}
