import { describe, expect, it } from "vitest";
import { isMfaSetupPath, isMfaTaskPath, isPendingSession } from "@/lib/auth/mfa";
import {
  decodeBase32,
  encodeBase32,
  generateTotpSecret,
  hashBackupCode,
  totpAt,
  totpAuthUrl,
  verifyBackupCode,
  verifyTotpCode,
} from "@/lib/auth/totp";
import { encodeTotpCookie, isTotpCookieValid } from "@/lib/auth/totp-cookie";

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
  it("allows app TOTP enrollment and verify routes", () => {
    expect(isMfaSetupPath("/mfa/setup")).toBe(true);
    expect(isMfaSetupPath("/mfa/verify")).toBe(true);
    expect(isMfaSetupPath("/sign-in/tasks")).toBe(true);
    expect(isMfaSetupPath("/account")).toBe(false);
    expect(isMfaSetupPath("/dashboard")).toBe(false);
  });
});

describe("Google Authenticator TOTP", () => {
  it("round-trips a Base32 secret", () => {
    const secret = generateTotpSecret();
    expect(encodeBase32(decodeBase32(secret))).toBe(secret);
  });

  it("accepts the current 6-digit Google Authenticator code", () => {
    const secret = generateTotpSecret();
    const now = Date.UTC(2026, 8, 20, 10, 0, 0);
    const code = totpAt(decodeBase32(secret), Math.floor(now / 1000));
    expect(code).toMatch(/^\d{6}$/);
    expect(verifyTotpCode(secret, code, now)).toBe(true);
    expect(verifyTotpCode(secret, "000000", now)).toBe(false);
  });

  it("builds an otpauth URL Google Authenticator can scan", () => {
    const url = totpAuthUrl("JBSWY3DPEHPK3PXP", "user@example.com");
    expect(url).toContain("otpauth://totp/");
    expect(url).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(url).toContain("issuer=Jawan+Investments");
  });

  it("consumes a matching backup code", () => {
    const hashes = [hashBackupCode("ABCDE12345")];
    expect(verifyBackupCode(hashes, "abcde-12345")).toBe(hashes[0]);
    expect(verifyBackupCode(hashes, "wrong")).toBeNull();
  });
});

describe("TOTP session cookie", () => {
  const key = Buffer.from("test-totp-cookie-key-32-bytes-ok!!");

  it("is valid only for the same Clerk user and session", () => {
    const value = encodeTotpCookie("user_1", "sess_1", key);
    expect(isTotpCookieValid(value, "user_1", "sess_1", key)).toBe(true);
    expect(isTotpCookieValid(value, "user_2", "sess_1", key)).toBe(false);
    expect(isTotpCookieValid(value, "user_1", "sess_2", key)).toBe(false);
    expect(isTotpCookieValid("tampered", "user_1", "sess_1", key)).toBe(false);
  });
});
