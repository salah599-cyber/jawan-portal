export {};

declare global {
  interface CustomJwtSessionClaims {
    /** Set via Clerk session token claims: `{{user.two_factor_enabled}}`. */
    twoFactorEnabled?: boolean | string;
  }
}
