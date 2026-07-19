import type { PublicMarket } from "@/lib/generated/prisma/client";

export type HoldingSymbolKey = {
  market: PublicMarket;
  symbol: string;
};

export function holdingSymbolKey(market: PublicMarket, symbol: string): string {
  return `${market}:${symbol.toUpperCase()}`;
}

export function findDuplicateSymbolKeys(
  holdings: Array<{ market: PublicMarket; symbol: string }>,
): Set<string> {
  const counts = new Map<string, number>();

  for (const holding of holdings) {
    const key = holdingSymbolKey(holding.market, holding.symbol);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return new Set(
    [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key),
  );
}

export function isDuplicateHolding(
  holding: { market: PublicMarket; symbol: string },
  duplicateKeys: Set<string>,
): boolean {
  return duplicateKeys.has(holdingSymbolKey(holding.market, holding.symbol));
}
