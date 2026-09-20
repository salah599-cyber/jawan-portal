import { describe, expect, it } from "vitest";
import {
  amrFromFactorVerificationAge,
  isMfaSetupPath,
  isMfaTaskPath,
  isPendingSession,
  isSecondFactorVerified,
  isTwoFactorEnabledClaim,
} from "@/lib/auth/mfa";

describe("isSecondFactorVerified", () => {
  it("is false when no second factor has been verified", () => {
    expect(isSecondFactorVerified(null)).toBe(false);
    expect(isSecondFactorVerified(undefined)).toBe(false);
    expect(isSecondFactorVerified([0, -1])).toBe(false);
  });

  it("is true after TOTP (or backup code) verification", () => {
    expect(isSecondFactorVerified([0, 0])).toBe(true);
    expect(isSecondFactorVerified([12, 3])).toBe(true);
  });
});

describe("amrFromFactorVerificationAge", () => {
  it("maps first-factor-only sessions to ['swk']", () => {
    expect(amrFromFactorVerificationAge([4, -1])).toEqual(["swk"]);
  });

  it("maps TOTP-completed sessions to ['swk', 'otp']", () => {
    expect(amrFromFactorVerificationAge([1, 0])).toEqual(["swk", "otp"]);
  });
});

describe("isTwoFactorEnabledClaim", () => {
  it("accepts boolean or string claims from the session JWT", () => {
    expect(isTwoFactorEnabledClaim(true)).toBe(true);
    expect(isTwoFactorEnabledClaim("true")).toBe(true);
    expect(isTwoFactorEnabledClaim(false)).toBe(false);
    expect(isTwoFactorEnabledClaim("false")).toBe(false);
  });
});

describe("isPendingSession", () => {
  it("is true only for Clerk pending session tasks", () => {
    expect(isPendingSession("pending")).toBe(true);
    expect(isPendingSession("active")).toBe(false);
    expect(isPendingSession(null)).toBe(false);
  });
});

describe("isMfaTaskPath", () => {
  it("matches only the setup-mfa task route", () => {
    expect(isMfaTaskPath("/sign-in/tasks")).toBe(true);
    expect(isMfaTaskPath("/sign-in/tasks/totp")).toBe(true);
    expect(isMfaTaskPath("/account")).toBe(false);
    expect(isMfaTaskPath("/sign-in")).toBe(false);
  });
});

describe("isMfaSetupPath", () => {
  it("allows enrollment and setup-mfa task routes", () => {
    expect(isMfaSetupPath("/account")).toBe(true);
    expect(isMfaSetupPath("/account/security")).toBe(true);
    expect(isMfaSetupPath("/sign-in/tasks")).toBe(true);
    expect(isMfaSetupPath("/dashboard")).toBe(false);
    expect(isMfaSetupPath("/portfolio/pe")).toBe(false);
    expect(isMfaSetupPath("/transfer-letters")).toBe(false);
  });
});
