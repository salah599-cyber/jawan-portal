import { describe, expect, it } from "vitest";
import { applyPeCarryingDelta } from "@/lib/pe/portfolio-rollup";
import type { PeCompanyListRow } from "@/lib/data/pe-portfolio";

function makeCompany(overrides: Partial<PeCompanyListRow> = {}): PeCompanyListRow {
  return {
    id: "co-1",
    name: "Acme",
    tradingName: null,
    country: null,
    sector: null,
    stage: "GROWTH",
    status: "ACTIVE",
    reportingCurrency: "USD",
    entityId: "ent-1",
    entityName: "Entity",
    assetId: "asset-1",
    totalInvested: 100,
    latestFairValue: 200,
    totalDistributed: 0,
    totalValue: 200,
    moic: 2,
    netIrr: null,
    investmentCount: 1,
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("applyPeCarryingDelta", () => {
  it("adds the full carrying value when the linked asset has no recorded value", () => {
    const totals = new Map<string, number>();
    applyPeCarryingDelta(
      [makeCompany()],
      new Map(),
      new Map([["asset-1", 100]]),
      (currency, amount) => {
        totals.set(currency, (totals.get(currency) ?? 0) + amount);
      },
    );

    expect(totals.get("USD")).toBe(200);
  });

  it("does not add a delta when the asset already reflects carrying value", () => {
    const totals = new Map<string, number>();
    applyPeCarryingDelta(
      [makeCompany()],
      new Map([["asset-1", 200]]),
      new Map([["asset-1", 100]]),
      (currency, amount) => {
        totals.set(currency, (totals.get(currency) ?? 0) + amount);
      },
    );

    expect(totals.size).toBe(0);
  });

  it("uses ownership-adjusted carrying targets when ownership is below 100%", () => {
    const totals = new Map<string, number>();
    applyPeCarryingDelta(
      [makeCompany({ latestFairValue: 1000 })],
      new Map([["asset-1", 250]]),
      new Map([["asset-1", 50]]),
      (currency, amount) => {
        totals.set(currency, (totals.get(currency) ?? 0) + amount);
      },
    );

    expect(totals.get("USD")).toBe(250);
  });
});
