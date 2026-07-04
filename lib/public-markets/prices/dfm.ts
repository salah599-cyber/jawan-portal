import { selectExchangeEodQuotes, type ExchangeEodQuote } from "@/lib/public-markets/prices/eod";

const DFM_STOCKS_LITE_URL = "https://api2.dfm.ae/web/widgets/v1/data";
/** Public subscription key embedded in the DFM website client bundle. */
const DFM_APIM_SUBSCRIPTION_KEY = "ffe783b64dc44a9981d858eac52cceb8";
const USER_AGENT =
  "Mozilla/5.0 (compatible; JawanPortal/1.0; +https://github.com/salah599-cyber/jawan-portal)";

type DfmStockLiteRow = {
  id?: string;
  p?: number;
  c?: number;
  cp?: number;
};

function rowToQuote(row: DfmStockLiteRow): ExchangeEodQuote | null {
  const symbol = row.id?.trim().toUpperCase();
  const closePrice = row.p;
  if (!symbol || closePrice == null || Number.isNaN(closePrice) || closePrice <= 0) {
    return null;
  }

  return {
    symbol,
    closePrice,
    currency: "AED",
  };
}

/** Fetches all DFM-listed securities via the official website widgets API. */
export async function fetchDfmMarketTicker(): Promise<Map<string, ExchangeEodQuote>> {
  const response = await fetch(DFM_STOCKS_LITE_URL, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "Ocp-Apim-Subscription-Key": DFM_APIM_SUBSCRIPTION_KEY,
      Origin: "https://www.dfm.ae",
      Referer: "https://www.dfm.ae/market-watch",
    },
    body: "Command=getstockslite",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`DFM stocks lite request failed (${response.status}).`);
  }

  const payload = (await response.json()) as DfmStockLiteRow[];
  const quotes = new Map<string, ExchangeEodQuote>();

  for (const row of payload) {
    const quote = rowToQuote(row);
    if (quote) {
      quotes.set(quote.symbol, quote);
    }
  }

  return quotes;
}

export async function fetchDfmEodQuotes(symbols: string[]): Promise<Map<string, ExchangeEodQuote>> {
  if (symbols.length === 0) {
    return new Map();
  }

  const allQuotes = await fetchDfmMarketTicker();
  return selectExchangeEodQuotes(allQuotes, symbols);
}
