import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
