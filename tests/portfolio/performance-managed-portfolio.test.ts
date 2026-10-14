import { describe, expect, it } from "vitest";

/**
 * Mirrors managedPortfolioPeriodReturnPct baseline allocation in performance.ts.
 */
function managedPortfolioReturnPctFromContext(input: {
  sliceValueOmr: number;
  parentCurrentOmr: number;
  parentBaselineOmr: number;
  ownershipPct: number;
  snapshotBaselineOmr: number | null;
}): number | null {
  const sliceCurrentOmr = (input.sliceValueOmr * input.ownershipPct) / 100;
  if (sliceCurrentOmr <= 0) return null;

  let periodBaselineOmr = 0;
  if (input.parentCurrentOmr > 0 && input.parentBaselineOmr > 0) {
    periodBaselineOmr = (sliceCurrentOmr / input.parentCurrentOmr) * input.parentBaselineOmr;
  }

  if (periodBaselineOmr <= 0) {
    if (input.snapshotBaselineOmr == null || input.snapshotBaselineOmr <= 0) return null;
    periodBaselineOmr = (input.snapshotBaselineOmr * input.ownershipPct) / 100;
  }

  return ((sliceCurrentOmr - periodBaselineOmr) / periodBaselineOmr) * 100;
}

describe("managed portfolio period return", () => {
  it("shares the parent public-equity baseline by current weight", () => {
    const returnPct = managedPortfolioReturnPctFromContext({
      sliceValueOmr: 500_000,
      parentCurrentOmr: 1_000_000,
      parentBaselineOmr: 800_000,
      ownershipPct: 100,
      snapshotBaselineOmr: 1,
    });

    expect(returnPct).toBeCloseTo(25, 5);
  });

  it("does not use a stale tiny snapshot when parent baseline is available", () => {
    const returnPct = managedPortfolioReturnPctFromContext({
      sliceValueOmr: 500_000,
      parentCurrentOmr: 1_000_000,
      parentBaselineOmr: 800_000,
      ownershipPct: 100,
      snapshotBaselineOmr: 0.01,
    });

    expect(returnPct).toBeCloseTo(25, 5);
    expect(returnPct).not.toBeGreaterThan(1000);
  });

  it("falls back to snapshot baseline when parent context is missing", () => {
    const returnPct = managedPortfolioReturnPctFromContext({
      sliceValueOmr: 110,
      parentCurrentOmr: 0,
      parentBaselineOmr: 0,
      ownershipPct: 100,
      snapshotBaselineOmr: 100,
    });

    expect(returnPct).toBeCloseTo(10, 5);
  });
});
