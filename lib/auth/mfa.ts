import { NextResponse, type NextRequest } from "next/server";

/** App-level Google Authenticator enrollment (open-source TOTP on top of Clerk). */
export const MFA_ENROLL_PATH = "/mfa/setup";

/** App-level TOTP challenge after Clerk password sign-in. */
export const MFA_VERIFY_PATH = "/mfa/verify";

/** Legacy Clerk `setup-mfa` session task path. */
export const MFA_TASKS_PATH = "/sign-in/tasks";

export const MFA_SIGN_IN_REASON = "mfa_required";
export const MFA_ENROLL_REASON = "mfa_enroll";

/** Forwarded from proxy so Server Components can skip MFA on enrollment routes. */
export const PATHNAME_HEADER = "x-jawan-pathname";

export function isPendingSession(sessionStatus: string | null | undefined): boolean {
  return sessionStatus === "pending";
}

export function isMfaTaskPath(pathname: string): boolean {
  return pathname === MFA_TASKS_PATH || pathname.startsWith(`${MFA_TASKS_PATH}/`);
}

export function isMfaSetupPath(pathname: string): boolean {
  return (
    pathname === MFA_ENROLL_PATH ||
    pathname.startsWith(`${MFA_ENROLL_PATH}/`) ||
    pathname === MFA_VERIFY_PATH ||
    pathname.startsWith(`${MFA_VERIFY_PATH}/`) ||
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

  const url = new URL(enrolled ? MFA_VERIFY_PATH : MFA_ENROLL_PATH, req.url);
  url.searchParams.set("reason", enrolled ? MFA_SIGN_IN_REASON : MFA_ENROLL_REASON);
  return NextResponse.redirect(url);
}
