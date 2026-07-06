const COINGECKO_API_URL = "https://api.coingecko.com/api/v3/simple/price";
const BATCH_SIZE = 100;

export type CoinGeckoQuote = {
  coinId: string;
  price: number;
  currency: string;
};

type CoinGeckoPriceResponse = Record<string, Record<string, number>>;

function getApiHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/json",
  };
  const apiKey = process.env.COINGECKO_API_KEY?.trim();
  if (apiKey) {
    headers["x-cg-demo-api-key"] = apiKey;
  }
  return headers;
}

export async function fetchCoinGeckoQuotes(
  coinIds: string[],
  vsCurrency = "usd",
): Promise<Map<string, CoinGeckoQuote>> {
  const uniqueIds = [...new Set(coinIds.map((id) => id.trim().toLowerCase()).filter(Boolean))];
  const quotes = new Map<string, CoinGeckoQuote>();

  if (uniqueIds.length === 0) {
    return quotes;
  }

  for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
    const batch = uniqueIds.slice(i, i + BATCH_SIZE);
    const params = new URLSearchParams({
      ids: batch.join(","),
      vs_currencies: vsCurrency,
    });

    const response = await fetch(`${COINGECKO_API_URL}?${params.toString()}`, {
      headers: getApiHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      continue;
    }

    const payload = (await response.json()) as CoinGeckoPriceResponse;
    for (const coinId of batch) {
      const price = payload[coinId]?.[vsCurrency];
      if (price == null || Number.isNaN(price)) continue;
      quotes.set(coinId, {
        coinId,
        price,
        currency: vsCurrency.toUpperCase(),
      });
    }
  }

  return quotes;
}
