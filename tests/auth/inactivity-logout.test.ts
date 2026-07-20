import { describe, expect, it } from "vitest";
import { isInactiveBeyondThreshold, parseLastActivity } from "@/lib/auth/inactivity";

describe("isInactiveBeyondThreshold", () => {
  it("returns false before the threshold is reached", () => {
    expect(isInactiveBeyondThreshold(1_000, 1_000 + 29 * 60 * 1000, 30 * 60 * 1000)).toBe(false);
  });

  it("returns true once the threshold is reached", () => {
    expect(isInactiveBeyondThreshold(1_000, 1_000 + 30 * 60 * 1000, 30 * 60 * 1000)).toBe(true);
  });
});

describe("parseLastActivity", () => {
  it("returns null for missing or invalid values", () => {
    expect(parseLastActivity(undefined)).toBeNull();
    expect(parseLastActivity("not-a-number")).toBeNull();
  });

  it("parses numeric timestamps", () => {
    expect(parseLastActivity("1700000000000")).toBe(1_700_000_000_000);
  });
});
