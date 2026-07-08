import { fetchCoinGeckoQuotes } from "@/lib/public-markets/prices/coingecko";
import {
  PRICE_SOURCE_COINGECKO,
  PRICE_SOURCE_MUSCAT_BULLION,
} from "@/lib/assets/precious-metals/constants";

export type SpotQuote = {
  bid: number;
  ask: number;
};

export type SpotQuotes = {
  gold: SpotQuote;
  silver: SpotQuote;
};

export type SpotQuotesResult = {
  quotes: SpotQuotes;
  source: string;
};

type GoldApiPayload = {
  price?: number;
  bid?: number;
  ask?: number;
};

const GOLD_ASK_PREMIUM_USD = 1.56;
const SILVER_ASK_PREMIUM_USD = 0.15;

function readSpot(payload: GoldApiPayload): SpotQuote {
  const bid = payload.bid ?? payload.price;
  if (bid == null || Number.isNaN(bid)) {
    throw new Error("GoldAPI response did not include a valid bid price.");
  }

  return {
    bid,
    ask: payload.ask ?? bid + GOLD_ASK_PREMIUM_USD,
  };
}

async function fetchFromGoldApi(apiKey: string): Promise<SpotQuotes> {
  const headers = {
    "x-access-token": apiKey,
    "Content-Type": "application/json",
  };

  const [goldResponse, silverResponse] = await Promise.all([
    fetch("https://www.goldapi.io/api/XAU/USD", { headers, cache: "no-store" }),
    fetch("https://www.goldapi.io/api/XAG/USD", { headers, cache: "no-store" }),
  ]);

  if (!goldResponse.ok) {
    throw new Error(`Gold price request failed (${goldResponse.status}).`);
  }
  if (!silverResponse.ok) {
    throw new Error(`Silver price request failed (${silverResponse.status}).`);
  }

  const [goldPayload, silverPayload] = (await Promise.all([
    goldResponse.json(),
    silverResponse.json(),
  ])) as [GoldApiPayload, GoldApiPayload];

  const gold = readSpot(goldPayload);
  const silver = readSpot(silverPayload);

  if (silver.ask == null || Number.isNaN(silver.ask)) {
    silver.ask = silver.bid + SILVER_ASK_PREMIUM_USD;
  }

  return { gold, silver };
}

const COINGECKO_GOLD_IDS = ["pax-gold", "tether-gold"] as const;
const COINGECKO_SILVER_ID = "kinesis-silver";

async function fetchFromCoinGecko(): Promise<SpotQuotes> {
  const quotes = await fetchCoinGeckoQuotes(
    [...COINGECKO_GOLD_IDS, COINGECKO_SILVER_ID],
    "usd",
  );

  const goldPrices = COINGECKO_GOLD_IDS.map((id) => quotes.get(id)?.price).filter(
    (price): price is number => price != null && Number.isFinite(price) && price > 0,
  );
  const silverPrice = quotes.get(COINGECKO_SILVER_ID)?.price;

  if (goldPrices.length === 0 || silverPrice == null || !Number.isFinite(silverPrice)) {
    throw new Error(
      "Could not fetch gold/silver spot prices. Add GOLD_API_KEY in Vercel for Muscat Bullion pricing, or try again later.",
    );
  }

  const goldBid = goldPrices.reduce((sum, price) => sum + price, 0) / goldPrices.length;

  return {
    gold: { bid: goldBid, ask: goldBid + GOLD_ASK_PREMIUM_USD },
    silver: { bid: silverPrice, ask: silverPrice + SILVER_ASK_PREMIUM_USD },
  };
}

export async function fetchSpotQuotesWithSource(): Promise<SpotQuotesResult> {
  const apiKey = process.env.GOLD_API_KEY?.trim();

  if (apiKey) {
    try {
      return {
        quotes: await fetchFromGoldApi(apiKey),
        source: PRICE_SOURCE_MUSCAT_BULLION,
      };
    } catch (error) {
      console.error("GoldAPI fetch failed, falling back to CoinGecko:", error);
    }
  }

  return {
    quotes: await fetchFromCoinGecko(),
    source: PRICE_SOURCE_COINGECKO,
  };
}

export async function fetchSpotQuotes(): Promise<SpotQuotes> {
  return (await fetchSpotQuotesWithSource()).quotes;
}
