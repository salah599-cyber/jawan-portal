const rawSuperAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim();

if (!rawSuperAdminEmail) {
  console.warn(
    "SUPER_ADMIN_EMAIL is not set. No user will be automatically bootstrapped as super admin — " +
      "set this environment variable to the email of the initial platform owner before first sign-in.",
  );
}

/** @deprecated Prefer `isBootstrapSuperAdminEmail` — this may be null if unconfigured. */
export const SUPER_ADMIN_EMAIL = rawSuperAdminEmail || null;

/**
 * Whether `email` matches the configured bootstrap super admin. Used only to grant the
 * very first super-admin account on sign-up; ownership afterwards is managed via the
 * User.isSuperAdmin flag and the user management UI, not this environment variable.
 */
export function isBootstrapSuperAdminEmail(email: string): boolean {
  if (!SUPER_ADMIN_EMAIL) return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}
