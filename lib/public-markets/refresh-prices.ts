import { db } from "@/lib/db";
import type { PublicMarket } from "@/lib/generated/prisma/client";
import { ensurePublicMarketsSchema } from "@/lib/db/ensure-public-markets-schema";
import { normalizeAndFormatHoldingValues } from "@/lib/public-markets/valuation";
import { fetchYahooQuotes } from "@/lib/public-markets/prices/yahoo";
import { isYahooPriceSupported, toYahooSymbol } from "@/lib/public-markets/prices/symbols";
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

  const now = new Date();
  let updated = 0;
  let failed = 0;
  const assetIds = new Set<string>();

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

    const quantity = toNumber(holding.quantity);
    const { decimals } = normalizeAndFormatHoldingValues({
      quantity,
      costBasis: toNumber(holding.costBasis),
      marketPrice: quote.price,
    }, { costBasisIsTotal: true });

    try {
      await db.publicEquityHolding.update({
        where: { id: holding.id },
        data: {
          marketPrice: decimals.marketPrice,
          marketValue: decimals.marketValue,
          unrealisedPnl: decimals.unrealisedPnl,
          priceFetchedAt: now,
          priceSource: "YAHOO",
          asOfDate: now,
        },
      });

      assetIds.add(holding.assetId);
      updated += 1;
    } catch {
      failed += 1;
    }
  }

  await Promise.all([...assetIds].map((assetId) => refreshAssetValue(assetId)));

  return {
    scanned: holdings.length,
    updated,
    skipped: holdings.length - refreshable.length,
    failed,
    assetIds: [...assetIds],
  };
}
