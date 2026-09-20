import {
  JWT_LIFETIME_MS,
  LAST_ACTIVITY_COOKIE,
  SESSION_BOUNDARY_COOKIE,
  SESSION_MAX_LIFETIME_MS,
  TOTP_COOKIE,
} from "@/lib/auth/constants";

export type SessionExpiryReason = "jwt_expired" | "session_expired";

const SESSION_BOUNDARY_SEPARATOR = ":";

export function encodeSessionBoundary(sessionId: string, startedAtMs: number) {
  return `${sessionId}${SESSION_BOUNDARY_SEPARATOR}${startedAtMs}`;
}

export function parseSessionBoundary(
  value: string | undefined | null,
): { sessionId: string; startedAtMs: number } | null {
  if (!value) return null;

  const separatorIndex = value.indexOf(SESSION_BOUNDARY_SEPARATOR);
  if (separatorIndex <= 0) return null;

  const sessionId = value.slice(0, separatorIndex);
  const startedAtMs = Number(value.slice(separatorIndex + 1));
  if (!sessionId || !Number.isFinite(startedAtMs)) return null;

  return { sessionId, startedAtMs };
}

export function resolveSessionStart(
  sessionId: string,
  boundaryValue: string | undefined | null,
  nowMs: number,
) {
  const parsed = parseSessionBoundary(boundaryValue);
  if (parsed?.sessionId === sessionId) {
    return parsed.startedAtMs;
  }

  return nowMs;
}

export function parseLastActivity(value: string | undefined | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isInactiveBeyondThreshold(
  lastActivityMs: number,
  nowMs: number,
  thresholdMs: number = JWT_LIFETIME_MS,
) {
  return nowMs - lastActivityMs >= thresholdMs;
}

export function getSessionExpiryReason(
  lastActivityMs: number | null,
  sessionStartedAtMs: number,
  nowMs: number,
  jwtLifetimeMs: number = JWT_LIFETIME_MS,
  maxSessionMs: number = SESSION_MAX_LIFETIME_MS,
): SessionExpiryReason | null {
  if (nowMs - sessionStartedAtMs >= maxSessionMs) {
    return "session_expired";
  }

  if (lastActivityMs !== null && isInactiveBeyondThreshold(lastActivityMs, nowMs, jwtLifetimeMs)) {
    return "jwt_expired";
  }

  return null;
}

export function activityCookieOptions() {
  return {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.ceil(JWT_LIFETIME_MS / 1000),
  };
}

export function sessionBoundaryCookieOptions() {
  return {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.ceil(SESSION_MAX_LIFETIME_MS / 1000),
  };
}

export function clearSessionCookies() {
  return [LAST_ACTIVITY_COOKIE, SESSION_BOUNDARY_COOKIE, TOTP_COOKIE] as const;
}
