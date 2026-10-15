import { describe, expect, it } from "vitest";
import { selectReliableBaseline } from "@/lib/portfolio/return-math";

/**
 * Mirrors managedPortfolioPeriodReturnPct using each slice's own baseline.
 */
function managedPortfolioReturnPctFromContext(input: {
  sliceValueOmr: number;
  ownershipPct: number;
  snapshotBaselineOmr: number | null;
}): number | null {
  const sliceCurrentOmr = (input.sliceValueOmr * input.ownershipPct) / 100;
  if (sliceCurrentOmr <= 0) return null;
  if (input.snapshotBaselineOmr == null || input.snapshotBaselineOmr <= 0) return null;

  const periodBaselineOmr = (input.snapshotBaselineOmr * input.ownershipPct) / 100;
  if (periodBaselineOmr <= 0) return null;

  return ((sliceCurrentOmr - periodBaselineOmr) / periodBaselineOmr) * 100;
}

describe("managed portfolio period return", () => {
  it("uses the slice's own baseline instead of parent allocation", () => {
    const returnPct = managedPortfolioReturnPctFromContext({
      sliceValueOmr: 550_000,
      ownershipPct: 100,
      snapshotBaselineOmr: 500_000,
    });

    expect(returnPct).toBeCloseTo(10, 5);
  });

  it("differentiates slices that previously all inherited the parent %", () => {
    const privatePct = managedPortfolioReturnPctFromContext({
      sliceValueOmr: 200_000,
      ownershipPct: 100,
      snapshotBaselineOmr: 180_000,
    });
    const managedPct = managedPortfolioReturnPctFromContext({
      sliceValueOmr: 800_000,
      ownershipPct: 100,
      snapshotBaselineOmr: 900_000,
    });

    expect(privatePct).toBeCloseTo(((200_000 - 180_000) / 180_000) * 100, 5);
    expect(managedPct).toBeCloseTo(((800_000 - 900_000) / 900_000) * 100, 5);
    expect(privatePct).not.toEqual(managedPct);
  });

  it("replaces a tiny stale snapshot with cost via selectReliableBaseline", () => {
    const baseline = selectReliableBaseline({
      beforePeriod: 0.01,
      firstInPeriod: null,
      costBasis: 500_000,
      currentValue: 550_000,
    });

    const returnPct = managedPortfolioReturnPctFromContext({
      sliceValueOmr: 550_000,
      ownershipPct: 100,
      snapshotBaselineOmr: baseline,
    });

    expect(returnPct).toBeCloseTo(10, 5);
    expect(returnPct).not.toBeGreaterThan(1000);
  });
});
