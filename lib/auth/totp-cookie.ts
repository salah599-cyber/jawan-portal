import { createHmac, timingSafeEqual } from "crypto";
import { SESSION_MAX_LIFETIME_MS, TOTP_COOKIE } from "@/lib/auth/constants";
import { totpCookieKey } from "@/lib/auth/totp";

export function totpCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.ceil(SESSION_MAX_LIFETIME_MS / 1000),
  };
}

export function encodeTotpCookie(userId: string, sessionId: string, key = totpCookieKey()) {
  const payload = `${userId}.${sessionId}`;
  const signature = createHmac("sha256", key).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function isTotpCookieValid(
  value: string | undefined | null,
  userId: string | null | undefined,
  sessionId: string | null | undefined,
  key = totpCookieKey(),
) {
  if (!value || !userId || !sessionId) return false;

  const lastDot = value.lastIndexOf(".");
  if (lastDot <= 0) return false;

  const payload = value.slice(0, lastDot);
  const signature = value.slice(lastDot + 1);
  const expected = `${userId}.${sessionId}`;
  if (payload !== expected) return false;

  const actual = createHmac("sha256", key).update(payload).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(actual);
  return a.length === b.length && timingSafeEqual(a, b);
}

export { TOTP_COOKIE };
