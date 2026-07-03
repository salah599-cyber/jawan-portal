const YAHOO_QUOTE_URL = "https://query1.finance.yahoo.com/v7/finance/quote";
const BATCH_SIZE = 40;
const USER_AGENT =
  "Mozilla/5.0 (compatible; JawanPortal/1.0; +https://github.com/salah599-cyber/jawan-portal)";

export type YahooQuote = {
  symbol: string;
  price: number;
  currency?: string;
};

type YahooQuoteResponse = {
  quoteResponse?: {
    result?: Array<{
      symbol?: string;
      regularMarketPrice?: number;
      currency?: string;
    }>;
    error?: unknown;
  };
};

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function fetchQuoteBatch(symbols: string[]): Promise<YahooQuote[]> {
  if (symbols.length === 0) return [];

  const url = `${YAHOO_QUOTE_URL}?symbols=${encodeURIComponent(symbols.join(","))}`;
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance request failed (${response.status}).`);
  }

  const payload = (await response.json()) as YahooQuoteResponse;
  const results = payload.quoteResponse?.result ?? [];
  const quotes: YahooQuote[] = [];

  for (const quote of results) {
    const price = quote.regularMarketPrice;
    if (!quote.symbol || price == null || Number.isNaN(price)) continue;
    quotes.push({
      symbol: quote.symbol,
      price,
      currency: quote.currency,
    });
  }

  return quotes;
}

export async function fetchYahooQuotes(symbols: string[]): Promise<Map<string, YahooQuote>> {
  const uniqueSymbols = [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))];
  const quotes = new Map<string, YahooQuote>();

  for (const batch of chunk(uniqueSymbols, BATCH_SIZE)) {
    const batchQuotes = await fetchQuoteBatch(batch);
    for (const quote of batchQuotes) {
      quotes.set(quote.symbol, quote);
    }
  }

  return quotes;
}
