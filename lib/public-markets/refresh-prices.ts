import { db } from "@/lib/db";
import type { PublicMarket } from "@/lib/generated/prisma/client";
import { ensurePublicMarketsSchema } from "@/lib/db/ensure-public-markets-schema";
import { normalizeAndFormatHoldingValues } from "@/lib/public-markets/valuation";
import { fetchDfmEodQuotes } from "@/lib/public-markets/prices/dfm";
import { fetchMsxEodQuotes } from "@/lib/public-markets/prices/msx";
import { fetchYahooQuotes } from "@/lib/public-markets/prices/yahoo";
import {
  getExchangeEodPriceSource,
  hasAutomaticPriceRefresh,
  isExchangeEodPriceSupported,
  isMsxEodPriceSupported,
  isUaeDfmEodPriceSupported,
  isYahooPriceSupported,
  toYahooSymbol,
} from "@/lib/public-markets/prices/symbols";
import { refreshAssetValue } from "@/lib/public-markets/import-reports";
import { fetchCoinGeckoQuotes } from "@/lib/public-markets/prices/coingecko";

export type PriceRefreshResult = {
  scanned: number;
  updated: number;
  skipped: number;
  failed: number;
  assetIds: string[];
};

type HoldingForRefresh = {
  id: string;
  assetId: string;
  market: PublicMarket;
  symbol: string;
  exchange: string | null;
  quantity: { toString(): string };
  costBasis: { toString(): string } | null;
};

type RefreshSliceResult = {
  updated: number;
  failed: number;
  assetIds: Set<string>;
  updatedHoldingIds: Set<string>;
};

function toNumber(value: { toString(): string } | null | undefined): number {
  if (value == null) return 0;
  const num = parseFloat(value.toString());
  return Number.isNaN(num) ? 0 : num;
}

async function applyQuoteToHolding(
  holding: HoldingForRefresh,
  marketPrice: number,
  priceSource: string,
  assetIds: Set<string>,
  updatedHoldingIds: Set<string>,
): Promise<boolean> {
  const quantity = toNumber(holding.quantity);
  const { decimals } = normalizeAndFormatHoldingValues(
    {
      quantity,
      costBasis: toNumber(holding.costBasis),
      marketPrice,
    },
    { costBasisIsTotal: true },
  );

  const now = new Date();

  try {
    await db.publicEquityHolding.update({
      where: { id: holding.id },
      data: {
        marketPrice: decimals.marketPrice,
        marketValue: decimals.marketValue,
        unrealisedPnl: decimals.unrealisedPnl,
        priceFetchedAt: now,
        priceSource,
        asOfDate: now,
      },
    });

    assetIds.add(holding.assetId);
    updatedHoldingIds.add(holding.id);
    return true;
  } catch {
    return false;
  }
}

async function refreshYahooHoldings(holdings: HoldingForRefresh[]): Promise<RefreshSliceResult> {
  const refreshable = holdings.filter((holding) => isYahooPriceSupported(holding.market));
  const yahooSymbolByHoldingId = new Map<string, string>();

  for (const holding of refreshable) {
    const yahooSymbol = toYahooSymbol({
      market: holding.market,
      symbol: holding.symbol,
      exchange: holding.exchange,
    });
    if (yahooSymbol) {
      yahooSymbolByHoldingId.set(holding.id, yahooSymbol);
    }
  }

  const uniqueYahooSymbols = [...new Set(yahooSymbolByHoldingId.values())];
  let quotes: Awaited<ReturnType<typeof fetchYahooQuotes>>;
  try {
    quotes = await fetchYahooQuotes(uniqueYahooSymbols);
  } catch {
    quotes = new Map();
  }

  const assetIds = new Set<string>();
  const updatedHoldingIds = new Set<string>();
  let updated = 0;
  let failed = 0;

  for (const holding of refreshable) {
    const yahooSymbol = yahooSymbolByHoldingId.get(holding.id);
    if (!yahooSymbol) {
      failed += 1;
      continue;
    }

    const quote = quotes.get(yahooSymbol);
    if (!quote) {
      failed += 1;
      continue;
    }

    const success = await applyQuoteToHolding(
      holding,
      quote.price,
      "YAHOO",
      assetIds,
      updatedHoldingIds,
    );
    if (success) {
      updated += 1;
    } else {
      failed += 1;
    }
  }

  return { updated, failed, assetIds, updatedHoldingIds };
}

async function refreshMsxEodHoldings(
  holdings: HoldingForRefresh[],
  updatedHoldingIds: Set<string>,
): Promise<RefreshSliceResult> {
  const refreshable = holdings.filter(
    (holding) =>
      isMsxEodPriceSupported(holding.market) && !updatedHoldingIds.has(holding.id),
  );
  const assetIds = new Set<string>();
  const sliceUpdatedHoldingIds = new Set<string>();
  let updated = 0;
  let failed = 0;

  if (refreshable.length === 0) {
    return { updated, failed, assetIds, updatedHoldingIds: sliceUpdatedHoldingIds };
  }

  let quotes: Awaited<ReturnType<typeof fetchMsxEodQuotes>>;
  try {
    quotes = await fetchMsxEodQuotes(refreshable.map((holding) => holding.symbol));
  } catch {
    return {
      updated: 0,
      failed: refreshable.length,
      assetIds,
      updatedHoldingIds: sliceUpdatedHoldingIds,
    };
  }

  const priceSource = getExchangeEodPriceSource("MSX") ?? "MSX_EOD";

  for (const holding of refreshable) {
    const quote = quotes.get(holding.symbol.trim().toUpperCase());
    if (!quote) {
      failed += 1;
      continue;
    }

    const success = await applyQuoteToHolding(
      holding,
      quote.closePrice,
      priceSource,
      assetIds,
      sliceUpdatedHoldingIds,
    );
    if (success) {
      updated += 1;
    } else {
      failed += 1;
    }
  }

  return { updated, failed, assetIds, updatedHoldingIds: sliceUpdatedHoldingIds };
}

async function refreshUaeDfmEodHoldings(
  holdings: HoldingForRefresh[],
  updatedHoldingIds: Set<string>,
): Promise<RefreshSliceResult> {
  const refreshable = holdings.filter(
    (holding) =>
      isUaeDfmEodPriceSupported(holding.market, holding.exchange) &&
      !updatedHoldingIds.has(holding.id),
  );
  const assetIds = new Set<string>();
  const sliceUpdatedHoldingIds = new Set<string>();
  let updated = 0;
  let failed = 0;

  if (refreshable.length === 0) {
    return { updated, failed, assetIds, updatedHoldingIds: sliceUpdatedHoldingIds };
  }

  let quotes: Awaited<ReturnType<typeof fetchDfmEodQuotes>>;
  try {
    quotes = await fetchDfmEodQuotes(refreshable.map((holding) => holding.symbol));
  } catch {
    return {
      updated: 0,
      failed: refreshable.length,
      assetIds,
      updatedHoldingIds: sliceUpdatedHoldingIds,
    };
  }

  const priceSource = getExchangeEodPriceSource("UAE") ?? "DFM_EOD";

  for (const holding of refreshable) {
    const quote = quotes.get(holding.symbol.trim().toUpperCase());
    if (!quote) {
      failed += 1;
      continue;
    }

    const success = await applyQuoteToHolding(
      holding,
      quote.closePrice,
      priceSource,
      assetIds,
      sliceUpdatedHoldingIds,
    );
    if (success) {
      updated += 1;
    } else {
      failed += 1;
    }
  }

  return { updated, failed, assetIds, updatedHoldingIds: sliceUpdatedHoldingIds };
}

async function refreshExchangeEodHoldings(
  holdings: HoldingForRefresh[],
  updatedHoldingIds: Set<string> = new Set(),
): Promise<RefreshSliceResult> {
  const [msxResult, uaeDfmResult] = await Promise.all([
    refreshMsxEodHoldings(holdings, updatedHoldingIds),
    refreshUaeDfmEodHoldings(holdings, updatedHoldingIds),
  ]);

  return {
    updated: msxResult.updated + uaeDfmResult.updated,
    failed: msxResult.failed + uaeDfmResult.failed,
    assetIds: new Set([...msxResult.assetIds, ...uaeDfmResult.assetIds]),
    updatedHoldingIds: new Set([
      ...msxResult.updatedHoldingIds,
      ...uaeDfmResult.updatedHoldingIds,
    ]),
  };
}

function countSkippedHoldings(holdings: HoldingForRefresh[]): number {
  return holdings.filter(
    (holding) => !hasAutomaticPriceRefresh(holding.market, holding.exchange),
  ).length;
}

export async function refreshPublicMarketPrices(options?: {
  entityId?: string;
  market?: PublicMarket;
}): Promise<PriceRefreshResult> {
  await ensurePublicMarketsSchema();

  const holdings = await db.publicEquityHolding.findMany({
    where: {
      ...(options?.market ? { market: options.market } : {}),
      instrumentType: "EQUITY",
      ...(options?.entityId
        ? {
            asset: {
              entityId: options.entityId,
            },
          }
        : {}),
    },
    select: {
      id: true,
      assetId: true,
      market: true,
      symbol: true,
      exchange: true,
      quantity: true,
      costBasis: true,
    },
  });

  const yahooResult = await refreshYahooHoldings(holdings);
  const eodResult = await refreshExchangeEodHoldings(holdings, yahooResult.updatedHoldingIds);

  const assetIds = new Set<string>([...yahooResult.assetIds, ...eodResult.assetIds]);
  await Promise.all([...assetIds].map((assetId) => refreshAssetValue(assetId)));

  return {
    scanned: holdings.length,
    updated: yahooResult.updated + eodResult.updated,
    skipped: countSkippedHoldings(holdings),
    failed: yahooResult.failed + eodResult.failed,
    assetIds: [...assetIds],
  };
}

export async function refreshGccEodPrices(options?: {
  entityId?: string;
  market?: PublicMarket;
}): Promise<PriceRefreshResult> {
  await ensurePublicMarketsSchema();

  const holdings = await db.publicEquityHolding.findMany({
    where: {
      ...(options?.market ? { market: options.market } : {}),
      instrumentType: "EQUITY",
      ...(options?.entityId
        ? {
            asset: {
              entityId: options.entityId,
            },
          }
        : {}),
    },
    select: {
      id: true,
      assetId: true,
      market: true,
      symbol: true,
      exchange: true,
      quantity: true,
      costBasis: true,
    },
  });

  const eodHoldings = holdings.filter((holding) =>
    isExchangeEodPriceSupported(holding.market, holding.exchange),
  );
  const eodResult = await refreshExchangeEodHoldings(eodHoldings);

  const assetIds = new Set<string>([...eodResult.assetIds]);
  await Promise.all([...assetIds].map((assetId) => refreshAssetValue(assetId)));

  return {
    scanned: holdings.length,
    updated: eodResult.updated,
    skipped: holdings.length - eodHoldings.length,
    failed: eodResult.failed,
    assetIds: [...assetIds],
  };
}

export async function refreshMsxEodPrices(options?: {
  entityId?: string;
}): Promise<PriceRefreshResult> {
  return refreshGccEodPrices({ ...options, market: "MSX" });
}

type CryptoHoldingForRefresh = {
  id: string;
  assetId: string;
  quantity: { toString(): string };
  costBasis: { toString(): string } | null;
  coinGeckoId: string;
};

export async function refreshCryptoPrices(options?: {
  entityId?: string;
}): Promise<PriceRefreshResult> {
  await ensurePublicMarketsSchema();

  const holdings = await db.publicEquityHolding.findMany({
    where: {
      instrumentType: "CRYPTO",
      ...(options?.entityId
        ? {
            asset: {
              entityId: options.entityId,
            },
          }
        : {}),
    },
    select: {
      id: true,
      assetId: true,
      quantity: true,
      costBasis: true,
      cryptoDetail: {
        select: {
          coinGeckoId: true,
        },
      },
    },
  });

  const holdingsWithCoinId: CryptoHoldingForRefresh[] = holdings.flatMap((holding) => {
    const coinGeckoId = holding.cryptoDetail?.coinGeckoId?.trim();
    if (!coinGeckoId) return [];
    return [
      {
        id: holding.id,
        assetId: holding.assetId,
        quantity: holding.quantity,
        costBasis: holding.costBasis,
        coinGeckoId,
      },
    ];
  });

  if (holdingsWithCoinId.length === 0) {
    return {
      scanned: holdings.length,
      updated: 0,
      skipped: holdings.length,
      failed: 0,
      assetIds: [],
    };
  }

  const coinIds = holdingsWithCoinId.map((holding) => holding.coinGeckoId);
  const quotes = await fetchCoinGeckoQuotes(coinIds);

  let updated = 0;
  let failed = 0;
  const assetIds = new Set<string>();

  for (const holding of holdingsWithCoinId) {
    const quote = quotes.get(holding.coinGeckoId.toLowerCase());
    if (!quote) {
      failed += 1;
      continue;
    }

    const success = await applyQuoteToHolding(
      {
        id: holding.id,
        assetId: holding.assetId,
        market: "OTHER",
        symbol: holding.coinGeckoId,
        exchange: null,
        quantity: holding.quantity,
        costBasis: holding.costBasis,
      },
      quote.price,
      "COINGECKO",
      assetIds,
      new Set<string>(),
    );
    if (success) {
      updated += 1;
    } else {
      failed += 1;
    }
  }

  await Promise.all([...assetIds].map((assetId) => refreshAssetValue(assetId)));

  return {
    scanned: holdings.length,
    updated,
    skipped: holdings.length - holdingsWithCoinId.length,
    failed,
    assetIds: [...assetIds],
  };
}
