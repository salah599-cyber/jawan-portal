import { describe, expect, it } from "vitest";
import {
  ABSURD_RETURN_RATIO,
  computeReturn,
  holdingReturnPct,
  pickBestWorstPerformers,
  resolveTotalCostBasis,
  selectReliableBaseline,
} from "@/lib/portfolio/return-math";

describe("computeReturn", () => {
  it("returns null for non-positive baselines", () => {
    expect(computeReturn(100, 0)).toBeNull();
    expect(computeReturn(100, -5)).toBeNull();
  });

  it("computes percent and absolute return", () => {
    expect(computeReturn(110, 100)).toEqual({ returnOmr: 10, returnPct: 10 });
    expect(computeReturn(80, 100)?.returnPct).toBeCloseTo(-20);
  });
});

describe("resolveTotalCostBasis", () => {
  it("keeps plausible total cost basis", () => {
    expect(
      resolveTotalCostBasis({
        quantity: 1_000,
        costBasis: 850,
        marketValue: 1_000,
      }),
    ).toBe(850);
  });

  it("reinterprets per-share cost when treating it as total is absurd (GICI-style)", () => {
    // costBasis stored as ~0.085/share instead of total; qty makes total ~850
    const total = resolveTotalCostBasis({
      quantity: 10_000,
      costBasis: 0.085,
      marketValue: 1_000,
    });
    expect(total).toBeCloseTo(850, 5);
    expect(1_000 / (total as number)).toBeLessThanOrEqual(ABSURD_RETURN_RATIO);
  });

  it("does not rescale when quantity is 1", () => {
    expect(
      resolveTotalCostBasis({
        quantity: 1,
        costBasis: 0.085,
        marketValue: 1_000,
      }),
    ).toBe(0.085);
  });

  it("does not rescale a true multi-bagger whose cost is already total", () => {
    // Bought for OMR 10 total, now worth OMR 1,500 (150x) — rare but valid.
    expect(
      resolveTotalCostBasis({
        quantity: 1_000,
        costBasis: 10,
        marketValue: 1_500,
      }),
    ).toBe(10);
  });
});

describe("holdingReturnPct", () => {
  it("computes unrealized return versus total cost", () => {
    expect(
      holdingReturnPct({
        quantity: 100,
        costBasis: 1_000,
        marketValue: 1_250,
      }),
    ).toBeCloseTo(25);
  });

  it("does not report ~11,688% when cost was stored per share", () => {
    const pct = holdingReturnPct({
      quantity: 10_000,
      costBasis: 0.085,
      marketValue: 1_000,
    });
    expect(pct).not.toBeNull();
    expect(pct as number).toBeLessThan(ABSURD_RETURN_RATIO * 100);
    expect(pct as number).toBeCloseTo(((1_000 - 850) / 850) * 100, 5);
  });

  it("returns null without cost or market value", () => {
    expect(holdingReturnPct({ quantity: 10, costBasis: null, marketValue: 100 })).toBeNull();
    expect(holdingReturnPct({ quantity: 10, costBasis: 50, marketValue: null })).toBeNull();
  });
});

describe("selectReliableBaseline", () => {
  it("prefers pre-period valuation when reliable", () => {
    expect(
      selectReliableBaseline({
        beforePeriod: 800_000,
        firstInPeriod: 810_000,
        costBasis: 500_000,
        currentValue: 850_000,
      }),
    ).toBe(800_000);
  });

  it("discards a tiny pre-period snapshot in favour of cost basis", () => {
    expect(
      selectReliableBaseline({
        beforePeriod: 8.5,
        firstInPeriod: null,
        costBasis: 850_000,
        currentValue: 1_000_000,
      }),
    ).toBe(850_000);
  });

  it("discards a tiny first-in-period snapshot in favour of cost basis", () => {
    expect(
      selectReliableBaseline({
        beforePeriod: null,
        firstInPeriod: 12,
        costBasis: 100_000,
        currentValue: 120_000,
      }),
    ).toBe(100_000);
  });
});

describe("pickBestWorstPerformers", () => {
  it("picks distinct best and worst even when hrefs match (MSX)", () => {
    const { best, worst } = pickBestWorstPerformers([
      { name: "GICI (MSX)", href: "/portfolio/msx", returnPct: 12 },
      { name: "OTEL (MSX)", href: "/portfolio/msx", returnPct: -8 },
      { name: "BKMB (MSX)", href: "/portfolio/msx", returnPct: 3 },
    ]);

    expect(best?.name).toBe("GICI (MSX)");
    expect(worst?.name).toBe("OTEL (MSX)");
  });

  it("clears worst when only one performer exists", () => {
    const { best, worst } = pickBestWorstPerformers([
      { name: "Only", href: "/x", returnPct: 5 },
    ]);
    expect(best?.name).toBe("Only");
    expect(worst).toBeNull();
  });
});
