import { describe, expect, it } from "vitest";
import { computeReturn } from "@/lib/portfolio/return-math";

describe("statement return math (Jawaher example)", () => {
  it("matches U-Capital Sep vs Aug NAV", () => {
    const baseline = 1_994_329.6;
    const current = 2_013_771.407;
    const result = computeReturn(current, baseline);
    expect(result?.returnOmr).toBeCloseTo(19_441.807, 0);
    expect(result?.returnPct).toBeCloseTo(0.975, 2);
  });

  it("does not form a return from a closing mark alone", () => {
    // Mirrors statement pairing: current without baseline must not invent a % .
    expect(computeReturn(2_000_000, 0)).toBeNull();
  });
});
