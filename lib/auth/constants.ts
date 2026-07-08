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

/** Sign out after this many milliseconds without user activity. */
export const INACTIVITY_LOGOUT_MS = 30 * 60 * 1000;

export const LAST_ACTIVITY_STORAGE_KEY = "jawan_last_activity";
