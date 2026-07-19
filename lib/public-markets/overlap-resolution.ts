import type { ParsedHolding } from "@/lib/public-markets/types";
import { normalizeHoldingValues } from "@/lib/public-markets/valuation";

export const OVERLAP_RESOLUTION_STRATEGIES = [
  "keep_manual",
  "replace_manual",
  "merge",
] as const;

export type OverlapResolutionStrategy = (typeof OVERLAP_RESOLUTION_STRATEGIES)[number];

export type ManualEquitySnapshot = {
  id: string;
  symbol: string;
  quantity: number;
  costBasis: number | null;
  marketPrice: number | null;
  marketValue: number | null;
  unrealisedPnl: number | null;
  name: string | null;
};

export type ManualOverlapDetail = {
  symbol: string;
  manualQuantity: number;
  manualCostBasis: number | null;
  manualMarketValue: number | null;
  importedQuantity: number;
};

export function parseOverlapResolution(value: string | null | undefined): OverlapResolutionStrategy {
  if (value && OVERLAP_RESOLUTION_STRATEGIES.includes(value as OverlapResolutionStrategy)) {
    return value as OverlapResolutionStrategy;
  }
  return "keep_manual";
}

function toNumber(value: { toString(): string } | number | null | undefined): number | null {
  if (value == null) return null;
  const num = typeof value === "number" ? value : parseFloat(value.toString());
  return Number.isNaN(num) ? null : num;
}

export function groupManualEquityHoldings(
  holdings: ManualEquitySnapshot[],
): Map<string, ManualEquitySnapshot[]> {
  const grouped = new Map<string, ManualEquitySnapshot[]>();

  for (const holding of holdings) {
    const symbol = holding.symbol.toUpperCase();
    const existing = grouped.get(symbol) ?? [];
    existing.push(holding);
    grouped.set(symbol, existing);
  }

  return grouped;
}

export function aggregateManualEquityHoldings(holdings: ManualEquitySnapshot[]): ManualEquitySnapshot {
  const first = holdings[0];
  const quantity = holdings.reduce((sum, holding) => sum + holding.quantity, 0);
  const costBasis = holdings.reduce((sum, holding) => sum + (holding.costBasis ?? 0), 0);
  const marketValue = holdings.reduce((sum, holding) => sum + (holding.marketValue ?? 0), 0);
  const unrealisedPnl = holdings.reduce((sum, holding) => sum + (holding.unrealisedPnl ?? 0), 0);

  return {
    id: first.id,
    symbol: first.symbol,
    quantity,
    costBasis: costBasis > 0 ? costBasis : null,
    marketPrice: first.marketPrice,
    marketValue: marketValue > 0 ? marketValue : null,
    unrealisedPnl: unrealisedPnl !== 0 ? unrealisedPnl : null,
    name: first.name,
  };
}

function normalizeImportedHolding(holding: ParsedHolding): ParsedHolding {
  const normalized = normalizeHoldingValues(
    {
      quantity: holding.quantity,
      costBasis: holding.costBasis,
      marketPrice: holding.marketPrice,
      marketValue: holding.marketValue,
      unrealisedPnl: holding.unrealisedPnl,
    },
    { costBasisIsTotal: false },
  );

  return {
    ...holding,
    costBasis: normalized.costBasis ?? undefined,
    marketPrice: normalized.marketPrice ?? undefined,
    marketValue: normalized.marketValue ?? undefined,
    unrealisedPnl: normalized.unrealisedPnl ?? undefined,
  };
}

export function mergeEquityHoldings(
  manual: ManualEquitySnapshot,
  imported: ParsedHolding,
): ParsedHolding {
  const normalizedImported = normalizeImportedHolding(imported);
  const quantity = manual.quantity + normalizedImported.quantity;
  const costBasis = (manual.costBasis ?? 0) + (normalizedImported.costBasis ?? 0);
  const marketPrice = normalizedImported.marketPrice ?? manual.marketPrice ?? undefined;
  const marketValue =
    marketPrice != null
      ? marketPrice * quantity
      : (manual.marketValue ?? 0) + (normalizedImported.marketValue ?? 0);
  const unrealisedPnl =
    marketValue != null && costBasis > 0 ? marketValue - costBasis : undefined;

  return {
    ...normalizedImported,
    symbol: normalizedImported.symbol,
    name: normalizedImported.name ?? manual.name ?? undefined,
    quantity,
    costBasis: costBasis > 0 ? costBasis : undefined,
    marketPrice,
    marketValue: marketValue > 0 ? marketValue : undefined,
    unrealisedPnl,
  };
}

export type OverlapResolutionResult = {
  holdings: ParsedHolding[];
  manualIdsToDelete: string[];
  skippedSymbols: string[];
  replacedSymbols: string[];
  mergedSymbols: string[];
};

export function resolveImportHoldings(
  holdings: ParsedHolding[],
  manualBySymbol: Map<string, ManualEquitySnapshot[]>,
  strategy: OverlapResolutionStrategy,
): OverlapResolutionResult {
  const manualIdsToDelete: string[] = [];
  const skippedSymbols: string[] = [];
  const replacedSymbols: string[] = [];
  const mergedSymbols: string[] = [];
  const resolved: ParsedHolding[] = [];

  for (const holding of holdings) {
    const symbol = holding.symbol.toUpperCase();
    const manualHoldings = manualBySymbol.get(symbol);

    if (!manualHoldings || manualHoldings.length === 0) {
      resolved.push(holding);
      continue;
    }

    if (strategy === "keep_manual") {
      skippedSymbols.push(symbol);
      continue;
    }

    if (strategy === "replace_manual") {
      manualIdsToDelete.push(...manualHoldings.map((entry) => entry.id));
      replacedSymbols.push(symbol);
      resolved.push(holding);
      continue;
    }

    const aggregatedManual = aggregateManualEquityHoldings(manualHoldings);
    manualIdsToDelete.push(...manualHoldings.map((entry) => entry.id));
    mergedSymbols.push(symbol);
    resolved.push(mergeEquityHoldings(aggregatedManual, holding));
  }

  return {
    holdings: resolved,
    manualIdsToDelete,
    skippedSymbols,
    replacedSymbols,
    mergedSymbols,
  };
}

export function buildManualOverlapDetails(
  holdings: ParsedHolding[],
  manualBySymbol: Map<string, ManualEquitySnapshot[]>,
): ManualOverlapDetail[] {
  const details: ManualOverlapDetail[] = [];

  for (const holding of holdings) {
    const symbol = holding.symbol.toUpperCase();
    const manualHoldings = manualBySymbol.get(symbol);
    if (!manualHoldings || manualHoldings.length === 0) continue;

    const aggregated = aggregateManualEquityHoldings(manualHoldings);
    details.push({
      symbol,
      manualQuantity: aggregated.quantity,
      manualCostBasis: aggregated.costBasis,
      manualMarketValue: aggregated.marketValue,
      importedQuantity: holding.quantity,
    });
  }

  return details.sort((a, b) => a.symbol.localeCompare(b.symbol));
}
