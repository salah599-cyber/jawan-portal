import { MFA_ENROLL_PATH, MFA_VERIFY_PATH } from "@/lib/auth/mfa";

export type TotpProgress = {
  enrolled: boolean;
  verified: boolean;
};

/** Where to send a signed-in Clerk user in the Google Authenticator flow. */
export function totpNextPath({ enrolled, verified }: TotpProgress) {
  if (verified) return "/dashboard";
  if (!enrolled) return MFA_ENROLL_PATH;
  return MFA_VERIFY_PATH;
}

export type EnrollmentAttempt = {
  totpEnabled: boolean;
  hasPendingSecret: boolean;
  codeValid: boolean;
};

export function enrollmentConfirmResult(attempt: EnrollmentAttempt) {
  if (attempt.totpEnabled) return "already_enrolled" as const;
  if (!attempt.hasPendingSecret) return "need_qr" as const;
  if (!attempt.codeValid) return "invalid_code" as const;
  return "enrolled" as const;
}

export type ExistingAccountTotpAction = "add_device" | "replace";

export function canManageExistingAuthenticator(enrolled: boolean, currentCodeValid: boolean) {
  return enrolled && currentCodeValid;
}

export function formatTotpSecret(secret: string) {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

export function formatBackupCode(code: string) {
  const cleaned = code.replace(/[\s-]/g, "").toUpperCase();
  if (cleaned.length <= 5) return cleaned;
  return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
}
