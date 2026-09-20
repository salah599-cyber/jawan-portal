/**
 * Bootstrap super-admin email, sourced from the environment rather than
 * hard-coded so ownership can be rotated without a code change. The first
 * user to sign in with this address becomes the permanent super admin.
 */
export const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL?.trim() || null;

if (!SUPER_ADMIN_EMAIL && process.env.NODE_ENV !== "test") {
  console.warn(
    "[auth] SUPER_ADMIN_EMAIL is not set. No user will be automatically bootstrapped as super admin.",
  );
}

export function isBootstrapSuperAdminEmail(email: string | null | undefined): boolean {
  if (!SUPER_ADMIN_EMAIL || !email) return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

/** Access token (JWT) validity window; refreshed on user activity. */
export const JWT_LIFETIME_MS = 30 * 60 * 1000;

/** Absolute session cap; refresh cannot extend beyond this from session start. */
export const SESSION_MAX_LIFETIME_MS = 60 * 60 * 1000;

/** @deprecated Use JWT_LIFETIME_MS */
export const INACTIVITY_LOGOUT_MS = JWT_LIFETIME_MS;

export const LAST_ACTIVITY_STORAGE_KEY = "jawan_last_activity";

/** Cookie mirrored by the client and refreshed on each authenticated request. */
export const LAST_ACTIVITY_COOKIE = "jawan_last_activity";

/** Binds session start time to the active Clerk session id. */
export const SESSION_BOUNDARY_COOKIE = "jawan_session_boundary";

export const SESSION_BOUNDARY_STORAGE_KEY = "jawan_session_boundary";

/** Minimum password length enforced in custom auth forms (Clerk enforces its own policy too). */
export const MIN_PASSWORD_LENGTH = 12;
