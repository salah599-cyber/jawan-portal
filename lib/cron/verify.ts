import { timingSafeEqual } from "crypto";

/**
 * Verifies the `Authorization: Bearer <CRON_SECRET>` header used by Vercel
 * Cron invocations. These routes are exempted from Clerk session auth in
 * `proxy.ts` since scheduled invocations carry no user session, so this
 * check is the only gate protecting them — it must fail closed when the
 * secret is not configured (never treat a missing secret as "no auth
 * required", which `Bearer undefined === Bearer undefined` would allow).
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;

  const provided = Buffer.from(authHeader);
  const expectedBuf = Buffer.from(expected);
  if (provided.length !== expectedBuf.length) return false;

  return timingSafeEqual(provided, expectedBuf);
}
