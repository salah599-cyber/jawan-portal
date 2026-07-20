import { clerkClient, clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { LAST_ACTIVITY_COOKIE } from "@/lib/auth/constants";
import {
  activityCookieOptions,
  isInactiveBeyondThreshold,
  parseLastActivity,
} from "@/lib/auth/inactivity";

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
  if (!userId) return;

  const now = Date.now();
  const lastActivity = parseLastActivity(req.cookies.get(LAST_ACTIVITY_COOKIE)?.value);

  if (lastActivity !== null && isInactiveBeyondThreshold(lastActivity, now)) {
    await revokeSession(sessionId);
    const response = inactivityResponse(req);
    response.cookies.delete(LAST_ACTIVITY_COOKIE);
    return response;
  }

  const response = NextResponse.next();
  response.cookies.set(LAST_ACTIVITY_COOKIE, String(now), activityCookieOptions());
  return response;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
