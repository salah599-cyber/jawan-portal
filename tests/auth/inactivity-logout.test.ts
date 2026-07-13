import { describe, expect, it } from "vitest";
import { isInactiveBeyondThreshold } from "@/components/auth/inactivity-logout";

describe("isInactiveBeyondThreshold", () => {
  it("returns false before the threshold is reached", () => {
    expect(isInactiveBeyondThreshold(1_000, 1_000 + 29 * 60 * 1000, 30 * 60 * 1000)).toBe(false);
  });

  it("returns true once the threshold is reached", () => {
    expect(isInactiveBeyondThreshold(1_000, 1_000 + 30 * 60 * 1000, 30 * 60 * 1000)).toBe(true);
  });
});
