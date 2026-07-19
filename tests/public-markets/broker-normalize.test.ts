import { describe, expect, it } from "vitest";
import { normalizeBrokerName } from "@/lib/public-markets/broker-normalize";

describe("normalizeBrokerName", () => {
  it("returns fallback for empty values", () => {
    expect(normalizeBrokerName(null)).toBe("Unknown Broker");
    expect(normalizeBrokerName("   ")).toBe("Unknown Broker");
    expect(normalizeBrokerName(undefined, "Broker")).toBe("Broker");
  });

  it("canonicalizes known broker aliases", () => {
    expect(normalizeBrokerName("ubs ag")).toBe("UBS");
    expect(normalizeBrokerName("Charles Schwab & Co.")).toBe("Charles Schwab");
    expect(normalizeBrokerName("IBKR")).toBe("Interactive Brokers");
    expect(normalizeBrokerName("jp morgan securities")).toBe("JPMorgan");
  });

  it("trims and collapses whitespace for unknown brokers", () => {
    expect(normalizeBrokerName("  Local   Broker  ")).toBe("Local Broker");
  });
});
