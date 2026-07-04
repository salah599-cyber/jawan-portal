import { selectExchangeEodQuotes, type ExchangeEodQuote } from "@/lib/public-markets/prices/eod";

const MSX_MARKET_TICKER_URL = "https://www.msx.om/api.aspx/MarketTicker";
const USER_AGENT =
  "Mozilla/5.0 (compatible; JawanPortal/1.0; +https://github.com/salah599-cyber/jawan-portal)";

export type MsxQuote = ExchangeEodQuote & {
  ltp: number;
};

type MsxMarketTickerRow = {
  Symbol?: string;
  ClosePrice?: string;
  LTP?: string;
};

type MsxMarketTickerResponse = {
  d?: MsxMarketTickerRow[];
};

function parseMsxPrice(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const num = parseFloat(value.replace(/,/g, ""));
  return Number.isNaN(num) || num <= 0 ? null : num;
}

function rowToQuote(row: MsxMarketTickerRow): MsxQuote | null {
  const symbol = row.Symbol?.trim().toUpperCase();
  if (!symbol) return null;

  const closePrice = parseMsxPrice(row.ClosePrice);
  const ltp = parseMsxPrice(row.LTP);
  const price = closePrice ?? ltp;
  if (price == null) return null;

  return {
    symbol,
    closePrice: closePrice ?? price,
    ltp: ltp ?? price,
    currency: "OMR",
  } satisfies MsxQuote;
}

/** Fetches all listed MSX securities from the official MarketTicker endpoint. */
export async function fetchMsxMarketTicker(): Promise<Map<string, MsxQuote>> {
  const response = await fetch(MSX_MARKET_TICKER_URL, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ Sector: "" }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`MSX MarketTicker request failed (${response.status}).`);
  }

  const payload = (await response.json()) as MsxMarketTickerResponse;
  const quotes = new Map<string, MsxQuote>();

  for (const row of payload.d ?? []) {
    const quote = rowToQuote(row);
    if (quote) {
      quotes.set(quote.symbol, quote);
    }
  }

  return quotes;
}

export async function fetchMsxEodQuotes(symbols: string[]): Promise<Map<string, MsxQuote>> {
  if (symbols.length === 0) {
    return new Map();
  }

  const allQuotes = await fetchMsxMarketTicker();
  return selectExchangeEodQuotes(allQuotes, symbols) as Map<string, MsxQuote>;
}
