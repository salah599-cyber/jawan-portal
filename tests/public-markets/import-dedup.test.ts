import { describe, expect, it } from "vitest";
import {
  findDuplicateSymbolKeys,
  holdingSymbolKey,
  isDuplicateHolding,
} from "@/lib/public-markets/holding-duplicates";
import {
  formatManualOverlapWarning,
  formatOverlapResolutionSummary,
} from "@/lib/public-markets/import-warnings";
import {
  aggregateManualEquityHoldings,
  buildManualOverlapDetails,
  mergeEquityHoldings,
  parseOverlapResolution,
  resolveImportHoldings,
} from "@/lib/public-markets/overlap-resolution";
import type { ParsedHolding } from "@/lib/public-markets/types";

describe("holding-duplicates", () => {
  it("builds stable symbol keys scoped by portfolio", () => {
    expect(
      holdingSymbolKey({ managedPortfolioId: "mp-1", market: "USA", symbol: "aapl" }),
    ).toBe("mp-1:USA:AAPL");
    expect(holdingSymbolKey({ managedPortfolioId: null, market: "USA", symbol: "aapl" })).toBe(
      "private:USA:AAPL",
    );
  });

  it("finds duplicate symbol keys within the same portfolio and market", () => {
    const duplicates = findDuplicateSymbolKeys([
      { managedPortfolioId: "mp-1", market: "USA", symbol: "AAPL" },
      { managedPortfolioId: "mp-1", market: "USA", symbol: "MSFT" },
      { managedPortfolioId: "mp-1", market: "USA", symbol: "AAPL" },
    ]);

    expect(duplicates).toEqual(new Set(["mp-1:USA:AAPL"]));
  });

  it("does not treat the same symbol in different portfolios as duplicates", () => {
    const duplicates = findDuplicateSymbolKeys([
      { managedPortfolioId: "mp-1", market: "USA", symbol: "AAPL" },
      { managedPortfolioId: "mp-2", market: "USA", symbol: "AAPL" },
      { managedPortfolioId: null, market: "USA", symbol: "AAPL" },
    ]);

    expect(duplicates.size).toBe(0);
  });

  it("detects whether a holding is duplicated", () => {
    const duplicates = new Set(["mp-1:USA:AAPL"]);

    expect(
      isDuplicateHolding(
        { managedPortfolioId: "mp-1", market: "USA", symbol: "AAPL" },
        duplicates,
      ),
    ).toBe(true);
    expect(
      isDuplicateHolding(
        { managedPortfolioId: "mp-2", market: "USA", symbol: "AAPL" },
        duplicates,
      ),
    ).toBe(false);
  });
});

describe("formatManualOverlapWarning", () => {
  it("returns an empty string when there are no overlaps", () => {
    expect(formatManualOverlapWarning([])).toBe("");
  });

  it("formats a single overlap", () => {
    expect(formatManualOverlapWarning(["AAPL"])).toContain("1 symbol already exists");
    expect(formatManualOverlapWarning(["AAPL"])).toContain("Choose how to handle overlaps");
  });
});

describe("formatOverlapResolutionSummary", () => {
  it("summarizes keep manual resolution", () => {
    const message = formatOverlapResolutionSummary("keep_manual", ["AAPL", "MSFT"]);
    expect(message).toContain("Kept manual entries");
    expect(message).toContain("AAPL, MSFT");
  });
});

describe("overlap-resolution", () => {
  const imported: ParsedHolding = {
    symbol: "AAPL",
    quantity: 100,
    costBasis: 15000,
    marketPrice: 195,
    marketValue: 19500,
  };

  const manual = {
    id: "manual-1",
    symbol: "AAPL",
    quantity: 20,
    costBasis: 3000,
    marketPrice: 190,
    marketValue: 3800,
    unrealisedPnl: 800,
    name: "Apple Inc.",
  };

  const manualBySymbol = new Map([["AAPL", [manual]]]);

  it("defaults to keep_manual when parsing unknown values", () => {
    expect(parseOverlapResolution(undefined)).toBe("keep_manual");
    expect(parseOverlapResolution("invalid")).toBe("keep_manual");
  });

  it("keeps manual entries by skipping overlapping imports", () => {
    const result = resolveImportHoldings([imported], manualBySymbol, "keep_manual");

    expect(result.holdings).toEqual([]);
    expect(result.skippedSymbols).toEqual(["AAPL"]);
    expect(result.manualIdsToDelete).toEqual([]);
  });

  it("replaces manual entries with imported holdings", () => {
    const result = resolveImportHoldings([imported], manualBySymbol, "replace_manual");

    expect(result.holdings).toEqual([imported]);
    expect(result.replacedSymbols).toEqual(["AAPL"]);
    expect(result.manualIdsToDelete).toEqual(["manual-1"]);
  });

  it("merges manual and imported quantities", () => {
    const result = resolveImportHoldings([imported], manualBySymbol, "merge");

    expect(result.mergedSymbols).toEqual(["AAPL"]);
    expect(result.holdings[0]?.quantity).toBe(120);
    expect(result.manualIdsToDelete).toEqual(["manual-1"]);
  });

  it("aggregates multiple manual rows for the same symbol", () => {
    const aggregated = aggregateManualEquityHoldings([
      { ...manual, quantity: 10, costBasis: 1000, marketValue: 1200 },
      { ...manual, id: "manual-2", quantity: 5, costBasis: 500, marketValue: 600 },
    ]);

    expect(aggregated.quantity).toBe(15);
    expect(aggregated.costBasis).toBe(1500);
    expect(aggregated.marketValue).toBe(1800);
  });

  it("builds overlap details for preview", () => {
    const details = buildManualOverlapDetails([imported], manualBySymbol);

    expect(details).toEqual([
      {
        symbol: "AAPL",
        manualQuantity: 20,
        manualCostBasis: 3000,
        manualMarketValue: 3800,
        importedQuantity: 100,
      },
    ]);
  });

  it("merges equity holdings with normalized imported cost basis", () => {
    const merged = mergeEquityHoldings(manual, imported);

    expect(merged.quantity).toBe(120);
    expect(merged.costBasis).toBe(18000);
    expect(merged.marketValue).toBe(23400);
  });
});
