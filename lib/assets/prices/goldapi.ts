export type SpotQuote = {
  bid: number;
  ask: number;
};

export type SpotQuotes = {
  gold: SpotQuote;
  silver: SpotQuote;
};

type GoldApiPayload = {
  price?: number;
  bid?: number;
  ask?: number;
};

function readSpot(payload: GoldApiPayload): SpotQuote {
  const bid = payload.bid ?? payload.price;
  if (bid == null || Number.isNaN(bid)) {
    throw new Error("GoldAPI response did not include a valid bid price.");
  }

  return {
    bid,
    ask: payload.ask ?? bid,
  };
}

export async function fetchSpotQuotes(): Promise<SpotQuotes> {
  const apiKey = process.env.GOLD_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GOLD_API_KEY is not configured.");
  }

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

  if (gold.ask == null || Number.isNaN(gold.ask)) {
    gold.ask = gold.bid + 1.56;
  }
  if (silver.ask == null || Number.isNaN(silver.ask)) {
    silver.ask = silver.bid + 0.15;
  }

  return { gold, silver };
}
