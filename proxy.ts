import { clerkClient, clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { LAST_ACTIVITY_COOKIE, SESSION_BOUNDARY_COOKIE } from "@/lib/auth/constants";
import {
  activityCookieOptions,
  clearSessionCookies,
  encodeSessionBoundary,
  getSessionExpiryReason,
  parseLastActivity,
  resolveSessionStart,
  sessionBoundaryCookieOptions,
  type SessionExpiryReason,
} from "@/lib/auth/session";

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

function sessionExpiryResponse(req: NextRequest, reason: SessionExpiryReason) {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const message =
      reason === "session_expired"
        ? "Session expired after the maximum duration."
        : "Session expired due to inactivity.";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  const url = new URL("/sign-in", req.url);
  url.searchParams.set("reason", reason);
  return NextResponse.redirect(url);
}

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    if (req.nextUrl.pathname === "/") {
      const { userId } = await auth();
      const url = req.nextUrl.clone();
      url.pathname = userId ? "/dashboard" : "/sign-in";
      return NextResponse.redirect(url);
    }
    return;
  }

  await auth.protect();

  const { userId, sessionId } = await auth();
  if (!userId || !sessionId) return;

  const now = Date.now();
  const sessionStartedAt = resolveSessionStart(
    sessionId,
    req.cookies.get(SESSION_BOUNDARY_COOKIE)?.value,
    now,
  );
  const lastActivity = parseLastActivity(req.cookies.get(LAST_ACTIVITY_COOKIE)?.value);
  const expiryReason = getSessionExpiryReason(lastActivity, sessionStartedAt, now);

  if (expiryReason) {
    await revokeSession(sessionId);
    const response = sessionExpiryResponse(req, expiryReason);
    for (const cookieName of clearSessionCookies()) {
      response.cookies.delete(cookieName);
    }
    return response;
  }

  const response = NextResponse.next();
  response.cookies.set(
    SESSION_BOUNDARY_COOKIE,
    encodeSessionBoundary(sessionId, sessionStartedAt),
    sessionBoundaryCookieOptions(),
  );
  response.cookies.set(LAST_ACTIVITY_COOKIE, String(now), activityCookieOptions());
  return response;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
