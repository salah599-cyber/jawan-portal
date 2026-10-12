import { describe, expect, it } from "vitest";
import { parseQuantity } from "@/lib/msx/parse-number";
import { rowToHolding } from "@/lib/msx/holdings";
import {
  fitsDecimal,
  fitsHoldingDecimal,
  isPersistableHoldingQuantity,
  normalizeAndFormatHoldingValues,
  normalizeCostBasisToTotal,
  toDecimalString,
} from "@/lib/public-markets/valuation";

describe("holding decimal limits", () => {
  it("accepts values within PublicEquityHolding Decimal(18, *) bounds", () => {
    expect(fitsDecimal(999_999_999_999, 18, 6)).toBe(true);
    expect(fitsHoldingDecimal(12_345.6789, "marketPrice")).toBe(true);
    expect(toDecimalString(1_250.5, 2)).toBe("1250.50");
  });

  it("rejects quantities that would overflow Decimal(18, 6)", () => {
    // 13 integer digits exceed NUMERIC(18,6) which allows 12 before the decimal.
    expect(fitsHoldingDecimal(1e13, "quantity")).toBe(false);
    expect(toDecimalString(1e13, 6)).toBeUndefined();
    expect(parseQuantity("10000000000000")).toBeUndefined();
    expect(parseQuantity("1,234,567")).toBe(1234567);
  });

  it("formats holdings without emitting overflow strings", () => {
    const ok = normalizeAndFormatHoldingValues({
      quantity: 10_000,
      costBasis: 2_500,
      marketPrice: 0.28,
      marketValue: 2_800,
      unrealisedPnl: 300,
    });
    expect(ok.decimals.quantity).toBe("10000.000000");
    expect(isPersistableHoldingQuantity(ok.decimals)).toBe(true);

    const overflowQty = normalizeAndFormatHoldingValues({
      quantity: 1e15,
      marketPrice: 0.25,
    });
    expect(overflowQty.decimals.quantity).toBeUndefined();
    expect(isPersistableHoldingQuantity(overflowQty.decimals)).toBe(false);
  });

  it("does not return a per-share cost product that overflows Decimal(18, 2)", () => {
    // Mis-parsed PDF rows can yield huge qty × cost products.
    const total = normalizeCostBasisToTotal(
      1e9,
      1e9,
      null,
      2e9,
      1e9, // implies total cost ≈ 1e9, but per-share product is 1e18
    );
    expect(fitsHoldingDecimal(total, "costBasis")).toBe(true);
    expect(total).toBe(1e9);
  });

  it("infers quantity from the first integer, not the largest market-value cell", () => {
    const holding = rowToHolding(
      ["BKMB", "Bank Muscat", 15_000, 0.25, 3_750, 125_000],
      {},
    );
    expect(holding?.symbol).toBe("BKMB");
    expect(holding?.quantity).toBe(15_000);
  });

  it("drops glued PDF quantities that exceed Decimal(18, 6)", () => {
    const holding = rowToHolding(
      ["OTEL", "Omantel", "150000025037500012550000", 0.25],
      { symbol: 0, name: 1, quantity: 2, marketPrice: 3 },
    );
    expect(holding).toBeNull();
  });
});
