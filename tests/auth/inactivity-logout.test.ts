import { describe, expect, it } from "vitest";
import {
  getSessionExpiryReason,
  isInactiveBeyondThreshold,
  parseLastActivity,
  parseSessionBoundary,
  resolveSessionStart,
} from "@/lib/auth/session";

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

describe("parseSessionBoundary", () => {
  it("parses session id and start time", () => {
    expect(parseSessionBoundary("sess_123:1700000000000")).toEqual({
      sessionId: "sess_123",
      startedAtMs: 1_700_000_000_000,
    });
  });

  it("returns null for invalid values", () => {
    expect(parseSessionBoundary(undefined)).toBeNull();
    expect(parseSessionBoundary("invalid")).toBeNull();
  });
});

describe("resolveSessionStart", () => {
  it("reuses the stored start time for the same session", () => {
    expect(resolveSessionStart("sess_123", "sess_123:1000", 5000)).toBe(1000);
  });

  it("resets the start time when the session id changes", () => {
    expect(resolveSessionStart("sess_new", "sess_old:1000", 5000)).toBe(5000);
  });
});

describe("getSessionExpiryReason", () => {
  const sessionStart = 1_000;
  const jwtLifetime = 30 * 60 * 1000;
  const maxSession = 60 * 60 * 1000;

  it("returns null while the session is active within both limits", () => {
    expect(
      getSessionExpiryReason(
        sessionStart + 10 * 60 * 1000,
        sessionStart,
        sessionStart + 20 * 60 * 1000,
        jwtLifetime,
        maxSession,
      ),
    ).toBeNull();
  });

  it("returns jwt_expired after 30 minutes of inactivity", () => {
    expect(
      getSessionExpiryReason(
        sessionStart,
        sessionStart,
        sessionStart + jwtLifetime,
        jwtLifetime,
        maxSession,
      ),
    ).toBe("jwt_expired");
  });

  it("returns session_expired after one hour even with recent activity", () => {
    expect(
      getSessionExpiryReason(
        sessionStart + 59 * 60 * 1000,
        sessionStart,
        sessionStart + maxSession,
        jwtLifetime,
        maxSession,
      ),
    ).toBe("session_expired");
  });
});
