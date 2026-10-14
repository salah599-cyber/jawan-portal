import { describe, expect, it } from "vitest";

function computeReturn(current: number, baseline: number) {
  if (baseline <= 0) return null;
  const returnOmr = current - baseline;
  return { returnOmr, returnPct: (returnOmr / baseline) * 100 };
}

describe("statement return math (Jawaher example)", () => {
  it("matches U-Capital Sep vs Aug NAV", () => {
    const baseline = 1_994_329.6;
    const current = 2_013_771.407;
    const result = computeReturn(current, baseline);
    expect(result?.returnOmr).toBeCloseTo(19_441.807, 0);
    expect(result?.returnPct).toBeCloseTo(0.975, 2);
  });
});
