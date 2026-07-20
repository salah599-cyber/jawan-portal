import { INACTIVITY_LOGOUT_MS } from "@/lib/auth/constants";

export function isInactiveBeyondThreshold(
  lastActivityMs: number,
  nowMs: number,
  thresholdMs: number = INACTIVITY_LOGOUT_MS,
) {
  return nowMs - lastActivityMs >= thresholdMs;
}

export function parseLastActivity(value: string | undefined | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function activityCookieOptions() {
  return {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.ceil(INACTIVITY_LOGOUT_MS / 1000),
  };
}
