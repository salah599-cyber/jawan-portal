import { describe, expect, it } from "vitest";
import {
  findDuplicateSymbolKeys,
  holdingSymbolKey,
  isDuplicateHolding,
} from "@/lib/public-markets/holding-duplicates";
import { formatManualOverlapWarning } from "@/lib/public-markets/import-warnings";

describe("holding-duplicates", () => {
  it("builds stable symbol keys", () => {
    expect(holdingSymbolKey("USA", "aapl")).toBe("USA:AAPL");
  });

  it("finds duplicate symbol keys within the same market", () => {
    const duplicates = findDuplicateSymbolKeys([
      { market: "USA", symbol: "AAPL" },
      { market: "USA", symbol: "MSFT" },
      { market: "USA", symbol: "AAPL" },
    ]);

    expect(duplicates).toEqual(new Set(["USA:AAPL"]));
  });

  it("does not treat the same symbol in different markets as duplicates", () => {
    const duplicates = findDuplicateSymbolKeys([
      { market: "USA", symbol: "AAPL" },
      { market: "MSX", symbol: "AAPL" },
    ]);

    expect(duplicates.size).toBe(0);
  });

  it("detects whether a holding is duplicated", () => {
    const duplicates = new Set(["USA:AAPL"]);

    expect(isDuplicateHolding({ market: "USA", symbol: "AAPL" }, duplicates)).toBe(true);
    expect(isDuplicateHolding({ market: "USA", symbol: "MSFT" }, duplicates)).toBe(false);
  });
});

describe("formatManualOverlapWarning", () => {
  it("returns an empty string when there are no overlaps", () => {
    expect(formatManualOverlapWarning([])).toBe("");
  });

  it("formats a single overlap", () => {
    expect(formatManualOverlapWarning(["AAPL"])).toContain("1 symbol already exists");
    expect(formatManualOverlapWarning(["AAPL"])).toContain("AAPL");
  });

  it("formats multiple overlaps", () => {
    const message = formatManualOverlapWarning(["AAPL", "MSFT", "GOOGL"]);
    expect(message).toContain("3 symbols already exist");
    expect(message).toContain("AAPL, MSFT, GOOGL");
  });

  it("truncates long overlap lists", () => {
    const message = formatManualOverlapWarning([
      "AAPL",
      "MSFT",
      "GOOGL",
      "AMZN",
      "META",
      "NVDA",
      "TSLA",
    ]);

    expect(message).toContain("and 2 more");
  });
});
