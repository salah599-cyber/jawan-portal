import { describe, expect, it } from "vitest";
import {
  aggregatePePortfolioMoic,
  computePeCompanyMetrics,
} from "@/lib/pe/metrics";

describe("computePeCompanyMetrics", () => {
  it("computes MOIC from fair value and distributions", () => {
    const metrics = computePeCompanyMetrics({
      investments: [{ date: new Date("2022-01-01"), amount: 100 }],
      distributions: [{ date: new Date("2023-06-01"), amount: 20 }],
      latestFairValue: 150,
      latestValuationDate: new Date("2024-01-01"),
    });

    expect(metrics.totalInvested).toBe(100);
    expect(metrics.totalDistributed).toBe(20);
    expect(metrics.carryingValue).toBe(150);
    expect(metrics.totalValue).toBe(170);
    expect(metrics.moic).toBeCloseTo(1.7);
    expect(metrics.netIrr).not.toBeNull();
    expect(metrics.netIrr!).toBeGreaterThan(0);
  });

  it("prefers exit proceeds for carrying value", () => {
    const metrics = computePeCompanyMetrics({
      investments: [{ date: new Date("2021-01-01"), amount: 200 }],
      distributions: [{ date: new Date("2022-01-01"), amount: 50 }],
      latestFairValue: 180,
      latestValuationDate: new Date("2023-01-01"),
      exitProceeds: 400,
      exitDate: new Date("2024-01-01"),
    });

    expect(metrics.carryingValue).toBe(400);
    expect(metrics.moic).toBeCloseTo(2.25);
  });

  it("returns null MOIC when there is no invested capital", () => {
    const metrics = computePeCompanyMetrics({
      investments: [],
      distributions: [],
      latestFairValue: null,
      latestValuationDate: null,
    });

    expect(metrics.moic).toBeNull();
    expect(metrics.netIrr).toBeNull();
  });
});

describe("aggregatePePortfolioMoic", () => {
  it("weights MOIC by invested capital across companies", () => {
    const portfolioMoic = aggregatePePortfolioMoic([
      {
        totalInvested: 100,
        totalDistributed: 0,
        carryingValue: 200,
        totalValue: 200,
        moic: 2,
        netIrr: null,
      },
      {
        totalInvested: 300,
        totalDistributed: 0,
        carryingValue: 300,
        totalValue: 300,
        moic: 1,
        netIrr: null,
      },
    ]);

    expect(portfolioMoic).toBeCloseTo(500 / 400);
  });
});
