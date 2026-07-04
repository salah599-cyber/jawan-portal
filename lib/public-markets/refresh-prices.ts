import { db } from "@/lib/db";
import type { PublicMarket } from "@/lib/generated/prisma/client";
import { ensurePublicMarketsSchema } from "@/lib/db/ensure-public-markets-schema";
import { normalizeAndFormatHoldingValues } from "@/lib/public-markets/valuation";
import { fetchMsxEodQuotes } from "@/lib/public-markets/prices/msx";
import { fetchYahooQuotes } from "@/lib/public-markets/prices/yahoo";
import {
  hasAutomaticPriceRefresh,
  isMsxEodPriceSupported,
  isYahooPriceSupported,
  toYahooSymbol,
} from "@/lib/public-markets/prices/symbols";
import { refreshAssetValue } from "@/lib/public-markets/import-reports";

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
    return true;
  } catch {
    return false;
  }
}

async function refreshYahooHoldings(holdings: HoldingForRefresh[]) {
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

    const success = await applyQuoteToHolding(holding, quote.price, "YAHOO", assetIds);
    if (success) {
      updated += 1;
    } else {
      failed += 1;
    }
  }

  return { updated, failed, assetIds };
}

async function refreshMsxHoldings(holdings: HoldingForRefresh[]) {
  const refreshable = holdings.filter((holding) => isMsxEodPriceSupported(holding.market));
  const assetIds = new Set<string>();
  let updated = 0;
  let failed = 0;

  if (refreshable.length === 0) {
    return { updated, failed, assetIds };
  }

  let quotes: Awaited<ReturnType<typeof fetchMsxEodQuotes>>;
  try {
    quotes = await fetchMsxEodQuotes(refreshable.map((holding) => holding.symbol));
  } catch {
    return { updated: 0, failed: refreshable.length, assetIds };
  }

  for (const holding of refreshable) {
    const quote = quotes.get(holding.symbol.trim().toUpperCase());
    if (!quote) {
      failed += 1;
      continue;
    }

    const success = await applyQuoteToHolding(
      holding,
      quote.closePrice,
      "MSX_EOD",
      assetIds,
    );
    if (success) {
      updated += 1;
    } else {
      failed += 1;
    }
  }

  return { updated, failed, assetIds };
}

export async function refreshPublicMarketPrices(options?: {
  entityId?: string;
  market?: PublicMarket;
}): Promise<PriceRefreshResult> {
  await ensurePublicMarketsSchema();

  const holdings = await db.publicEquityHolding.findMany({
    where: {
      ...(options?.market ? { market: options.market } : {}),
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

  const [yahooResult, msxResult] = await Promise.all([
    refreshYahooHoldings(holdings),
    refreshMsxHoldings(holdings),
  ]);

  const assetIds = new Set<string>([...yahooResult.assetIds, ...msxResult.assetIds]);
  await Promise.all([...assetIds].map((assetId) => refreshAssetValue(assetId)));

  const refreshableCount = holdings.filter((holding) =>
    hasAutomaticPriceRefresh(holding.market),
  ).length;

  return {
    scanned: holdings.length,
    updated: yahooResult.updated + msxResult.updated,
    skipped: holdings.length - refreshableCount,
    failed: yahooResult.failed + msxResult.failed,
    assetIds: [...assetIds],
  };
}

export async function refreshMsxEodPrices(options?: {
  entityId?: string;
}): Promise<PriceRefreshResult> {
  return refreshPublicMarketPrices({ ...options, market: "MSX" });
}
