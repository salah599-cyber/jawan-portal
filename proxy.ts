import { clerkClient, clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { LAST_ACTIVITY_COOKIE } from "@/lib/auth/constants";
import {
  activityCookieOptions,
  isInactiveBeyondThreshold,
  parseLastActivity,
} from "@/lib/auth/inactivity";
import {
  PATHNAME_HEADER,
  isMfaSetupPath,
  isMfaTaskPath,
  isPendingSession,
  isSecondFactorVerified,
  mfaIncompleteResponse,
  resolveTwoFactorEnabled,
} from "@/lib/auth/mfa";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/forgot-password",
  "/invite-required",
  "/api/webhooks(.*)",
  "/api/share/(.*)",
  // Vercel Cron requests carry no Clerk session; these routes authenticate
  // themselves via the CRON_SECRET bearer token instead.
  "/api/cron/(.*)",
]);

async function revokeSession(sessionId: string | null | undefined) {
  if (!sessionId) return;
  try {
    const clerk = await clerkClient();
    await clerk.sessions.revokeSession(sessionId);
  } catch {
    // Session may already be revoked.
  }
}

function inactivityResponse(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Session expired due to inactivity." }, { status: 401 });
  }

  const url = new URL("/sign-in", req.url);
  url.searchParams.set("reason", "session_timeout");
  return NextResponse.redirect(url);
}

function withPathnameHeader(response: NextResponse, pathname: string) {
  response.headers.set(PATHNAME_HEADER, pathname);
  return response;
}

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;

  if (isPublicRoute(req)) {
    if (pathname === "/") {
      const { userId, sessionStatus } = await auth();
      const url = req.nextUrl.clone();
      url.pathname = isPendingSession(sessionStatus)
        ? "/sign-in/tasks"
        : userId
          ? "/dashboard"
          : "/sign-in";
      return NextResponse.redirect(url);
    }
    return;
  }

  // Pending setup-mfa sessions are signed-out by default. Check status before
  // auth.protect() so users reach TaskSetupMFA instead of a sign-in loop.
  const pendingAuth = await auth();
  if (isPendingSession(pendingAuth.sessionStatus) && !isMfaTaskPath(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Multi-factor authentication is required." },
        { status: 403 },
      );
    }
    return NextResponse.redirect(new URL("/sign-in/tasks", req.url));
  }

  // Equivalent of requireSignIn(): unsigned requests never reach /dashboard
  // or investment/transaction routes. <SignIn forceRedirectUrl> is not a guard.
  await auth.protect();

  const { userId, sessionId, factorVerificationAge, sessionClaims } = await auth();
  if (!userId) return;

  if (!isSecondFactorVerified(factorVerificationAge) && !isMfaSetupPath(pathname)) {
    const enrolled = await resolveTwoFactorEnabled(sessionClaims, userId);
    if (enrolled) {
      await revokeSession(sessionId);
    }
    return mfaIncompleteResponse(req, enrolled);
  }

  const now = Date.now();
  const lastActivity = parseLastActivity(req.cookies.get(LAST_ACTIVITY_COOKIE)?.value);

  if (lastActivity !== null && isInactiveBeyondThreshold(lastActivity, now)) {
    await revokeSession(sessionId);
    const response = inactivityResponse(req);
    response.cookies.delete(LAST_ACTIVITY_COOKIE);
    return response;
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(PATHNAME_HEADER, pathname);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.set(LAST_ACTIVITY_COOKIE, String(now), activityCookieOptions());
  return withPathnameHeader(response, pathname);
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
