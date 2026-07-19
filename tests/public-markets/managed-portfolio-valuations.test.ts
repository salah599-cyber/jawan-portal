import { describe, expect, it } from "vitest";

function sameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

describe("managed portfolio valuation helpers", () => {
  it("detects same UTC calendar day", () => {
    const morning = new Date("2026-07-19T08:00:00.000Z");
    const evening = new Date("2026-07-19T20:00:00.000Z");
    const nextDay = new Date("2026-07-20T00:00:00.000Z");

    expect(sameUtcDay(morning, evening)).toBe(true);
    expect(sameUtcDay(morning, nextDay)).toBe(false);
  });
});
