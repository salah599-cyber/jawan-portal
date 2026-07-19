import type { PublicMarket } from "@/lib/generated/prisma/client";

export type HoldingSymbolKey = {
  managedPortfolioId?: string | null;
  market: PublicMarket;
  symbol: string;
};

export function holdingSymbolKey({
  managedPortfolioId,
  market,
  symbol,
}: HoldingSymbolKey): string {
  const portfolioKey = managedPortfolioId ?? "private";
  return `${portfolioKey}:${market}:${symbol.toUpperCase()}`;
}

export function findDuplicateSymbolKeys(
  holdings: Array<{
    managedPortfolioId?: string | null;
    market: PublicMarket;
    symbol: string;
  }>,
): Set<string> {
  const counts = new Map<string, number>();

  for (const holding of holdings) {
    const key = holdingSymbolKey(holding);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return new Set(
    [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key),
  );
}

export function isDuplicateHolding(
  holding: {
    managedPortfolioId?: string | null;
    market: PublicMarket;
    symbol: string;
  },
  duplicateKeys: Set<string>,
): boolean {
  return duplicateKeys.has(holdingSymbolKey(holding));
}
