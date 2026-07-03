const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const CONCURRENCY = 8;
const USER_AGENT =
  "Mozilla/5.0 (compatible; JawanPortal/1.0; +https://github.com/salah599-cyber/jawan-portal)";

export type YahooQuote = {
  symbol: string;
  price: number;
  currency?: string;
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        regularMarketPrice?: number;
        currency?: string;
      };
    }>;
    error?: {
      code?: string;
      description?: string;
    };
  };
};

async function fetchChartQuote(requestedSymbol: string): Promise<YahooQuote | null> {
  const url = `${YAHOO_CHART_URL}/${encodeURIComponent(requestedSymbol)}?interval=1d&range=1d`;
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as YahooChartResponse;
  const meta = payload.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;

  if (!meta?.symbol || price == null || Number.isNaN(price)) {
    return null;
  }

  return {
    symbol: meta.symbol,
    price,
    currency: meta.currency,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    const batchResults = await Promise.all(batch.map(mapper));
    results.push(...batchResults);
  }

  return results;
}

export async function fetchYahooQuotes(symbols: string[]): Promise<Map<string, YahooQuote>> {
  const uniqueSymbols = [
    ...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)),
  ];
  const quotes = new Map<string, YahooQuote>();

  if (uniqueSymbols.length === 0) {
    return quotes;
  }

  const fetched = await mapWithConcurrency(uniqueSymbols, CONCURRENCY, async (symbol) => {
    try {
      return await fetchChartQuote(symbol);
    } catch {
      return null;
    }
  });

  for (const quote of fetched) {
    if (quote) {
      quotes.set(quote.symbol, quote);
    }
  }

  return quotes;
}
