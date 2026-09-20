import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

/** Path where users enroll TOTP via Clerk UserProfile. */
export const MFA_ENROLL_PATH = "/account";

/** Path for the Clerk `setup-mfa` session task. */
export const MFA_TASKS_PATH = "/sign-in/tasks";

export const MFA_SIGN_IN_REASON = "mfa_required";
export const MFA_ENROLL_REASON = "mfa_enroll";

/** Forwarded from proxy so Server Components can skip MFA on enrollment routes. */
export const PATHNAME_HEADER = "x-jawan-pathname";

export type FactorVerificationAge = [firstFactorAge: number, secondFactorAge: number];

/**
 * RFC 8176 AMR values Clerk sessions map to:
 * `swk` = software-secured first factor (password / software key)
 * `otp` = TOTP (or backup code) second factor
 */
export type AuthenticationMethodRef = "swk" | "otp";

export function isSecondFactorVerified(
  factorVerificationAge: FactorVerificationAge | null | undefined,
): boolean {
  return Array.isArray(factorVerificationAge) && factorVerificationAge[1] !== -1;
}

export function isTwoFactorEnabledClaim(value: unknown): boolean {
  return value === true || value === "true";
}

export function amrFromFactorVerificationAge(
  factorVerificationAge: FactorVerificationAge | null | undefined,
): AuthenticationMethodRef[] {
  if (!Array.isArray(factorVerificationAge)) return [];
  const amr: AuthenticationMethodRef[] = ["swk"];
  if (factorVerificationAge[1] !== -1) amr.push("otp");
  return amr;
}

export function isPendingSession(sessionStatus: string | null | undefined): boolean {
  return sessionStatus === "pending";
}

/** Clerk `setup-mfa` task page. Pending sessions are signed-out until this completes. */
export function isMfaTaskPath(pathname: string): boolean {
  return pathname === MFA_TASKS_PATH || pathname.startsWith(`${MFA_TASKS_PATH}/`);
}

export function isMfaSetupPath(pathname: string): boolean {
  return (
    pathname === MFA_ENROLL_PATH ||
    pathname.startsWith(`${MFA_ENROLL_PATH}/`) ||
    isMfaTaskPath(pathname)
  );
}

export function mfaIncompleteResponse(req: NextRequest, enrolled: boolean) {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Multi-factor authentication is required." },
      { status: 403 },
    );
  }

  const url = new URL(enrolled ? "/sign-in" : MFA_ENROLL_PATH, req.url);
  url.searchParams.set("reason", enrolled ? MFA_SIGN_IN_REASON : MFA_ENROLL_REASON);
  return NextResponse.redirect(url);
}

export async function resolveTwoFactorEnabled(
  sessionClaims: CustomJwtSessionClaims | null | undefined,
  userId: string,
): Promise<boolean> {
  if (sessionClaims?.twoFactorEnabled !== undefined) {
    return isTwoFactorEnabledClaim(sessionClaims.twoFactorEnabled);
  }

  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    return user.twoFactorEnabled === true;
  } catch {
    return false;
  }
}
