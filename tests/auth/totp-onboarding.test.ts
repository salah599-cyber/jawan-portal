import { describe, expect, it } from "vitest";
import { MFA_ENROLL_PATH, MFA_VERIFY_PATH, totpChallengePath } from "@/lib/auth/mfa";
import {
  canManageExistingAuthenticator,
  enrollmentConfirmResult,
  formatBackupCode,
  formatTotpSecret,
  totpNextPath,
} from "@/lib/auth/totp-flow";
import {
  decodeBase32,
  generateBackupCodes,
  generateTotpSecret,
  hashBackupCode,
  totpAt,
  totpAuthUrl,
  verifyBackupCode,
  verifyTotpCode,
} from "@/lib/auth/totp";

describe("totpNextPath onboarding", () => {
  it("sends accounts without Google Authenticator to setup", () => {
    expect(totpNextPath({ enrolled: false, verified: false })).toBe(MFA_ENROLL_PATH);
    expect(totpChallengePath(false)).toBe(MFA_ENROLL_PATH);
  });

  it("sends enrolled accounts to the 6-digit challenge", () => {
    expect(totpNextPath({ enrolled: true, verified: false })).toBe(MFA_VERIFY_PATH);
    expect(totpChallengePath(true)).toBe(MFA_VERIFY_PATH);
  });

  it("opens the dashboard after a verified authenticator code", () => {
    expect(totpNextPath({ enrolled: true, verified: true })).toBe("/dashboard");
  });
});

describe("first-time Google Authenticator enrollment", () => {
  it("asks for a QR scan before a code can be confirmed", () => {
    expect(
      enrollmentConfirmResult({ totpEnabled: false, hasPendingSecret: false, codeValid: true }),
    ).toBe("need_qr");
  });

  it("rejects a wrong code after the QR is shown", () => {
    expect(
      enrollmentConfirmResult({ totpEnabled: false, hasPendingSecret: true, codeValid: false }),
    ).toBe("invalid_code");
  });

  it("completes onboarding when the Google Authenticator code matches", () => {
    expect(
      enrollmentConfirmResult({ totpEnabled: false, hasPendingSecret: true, codeValid: true }),
    ).toBe("enrolled");
  });

  it("does not restart enrollment for an account that already has TOTP", () => {
    expect(
      enrollmentConfirmResult({ totpEnabled: true, hasPendingSecret: true, codeValid: true }),
    ).toBe("already_enrolled");
  });

  it("accepts a live TOTP code generated from the pending secret", () => {
    const secret = generateTotpSecret();
    const now = Date.UTC(2026, 8, 20, 14, 46, 0);
    const code = totpAt(decodeBase32(secret), Math.floor(now / 1000));
    expect(verifyTotpCode(secret, code, now)).toBe(true);
    expect(
      enrollmentConfirmResult({
        totpEnabled: false,
        hasPendingSecret: true,
        codeValid: verifyTotpCode(secret, code, now),
      }),
    ).toBe("enrolled");
  });
});

describe("adding an existing account to Google Authenticator", () => {
  it("requires the current authenticator code before showing the QR", () => {
    expect(canManageExistingAuthenticator(true, false)).toBe(false);
    expect(canManageExistingAuthenticator(false, true)).toBe(false);
    expect(canManageExistingAuthenticator(true, true)).toBe(true);
  });

  it("builds a Google Authenticator URL for the existing secret", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const url = totpAuthUrl(secret, "family@jawaninvest.com");
    expect(url.startsWith("otpauth://totp/")).toBe(true);
    expect(url).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(url).toContain("family%40jawaninvest.com");
  });

  it("formats the manual key and backup codes for display", () => {
    expect(formatTotpSecret("JBSWY3DPEHPK3PXP")).toBe("JBSW Y3DP EHPK 3PXP");
    expect(formatBackupCode("ABCDE12345")).toBe("ABCDE-12345");
  });

  it("lets a backup code stand in when replacing an authenticator", () => {
    const codes = generateBackupCodes(2);
    const hashes = codes.map(hashBackupCode);
    expect(verifyBackupCode(hashes, codes[0])).toBe(hashes[0]);
    expect(verifyBackupCode(hashes.filter((hash) => hash !== hashes[0]), codes[0])).toBeNull();
  });
});
