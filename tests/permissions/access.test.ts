import { describe, expect, it } from "vitest";
import { canAccess, canManageUsers, canWrite, getModulePermission, isSuperAdmin } from "@/lib/permissions/access";
import { makeUserContext, withOverride, withRole } from "../helpers/user-context";

describe("getModulePermission", () => {
  it("returns FULL for every module when the user is a super admin, regardless of role", () => {
    const ctx = withRole("EXTERNAL", { isSuperAdmin: true });
    expect(getModulePermission(ctx, "USERS")).toBe("FULL");
    expect(getModulePermission(ctx, "AUDIT")).toBe("FULL");
  });

  it("falls back to the role matrix when there is no override", () => {
    const ctx = withRole("FINANCE");
    expect(getModulePermission(ctx, "LOANS")).toBe("FULL");
    expect(getModulePermission(ctx, "USERS")).toBe("NONE");
  });

  it("prefers a per-user override over the role matrix", () => {
    const ctx = withOverride("EXTERNAL", "DOCUMENTS", "FULL");
    expect(getModulePermission(ctx, "DOCUMENTS")).toBe("FULL");
    // Unrelated modules still fall back to the role matrix.
    expect(getModulePermission(ctx, "ASSETS")).toBe("NONE");
  });
});

describe("canAccess", () => {
  it("is true for super admins on any module", () => {
    const ctx = withRole("EXTERNAL", { isSuperAdmin: true });
    expect(canAccess(ctx, "USERS")).toBe(true);
  });

  it("is false when the resolved permission level is NONE", () => {
    const ctx = withRole("EXTERNAL");
    expect(canAccess(ctx, "ASSETS")).toBe(false);
  });

  it("is true for READ, FILTERED, and FULL levels", () => {
    expect(canAccess(withRole("SIGNATORY"), "ASSETS")).toBe(true); // READ
    expect(canAccess(withRole("DIRECTOR"), "ASSETS")).toBe(true); // FILTERED
    expect(canAccess(withRole("PRINCIPAL"), "ASSETS")).toBe(true); // FULL
  });

  it("treats SHARED_ONLY as accessible (not NONE)", () => {
    expect(canAccess(withRole("EXTERNAL"), "DOCUMENTS")).toBe(true);
  });
});

describe("canWrite", () => {
  it("requires FULL permission, not just READ or FILTERED", () => {
    expect(canWrite(withRole("SIGNATORY"), "ASSETS")).toBe(false); // READ
    expect(canWrite(withRole("DIRECTOR"), "ASSETS")).toBe(false); // FILTERED
    expect(canWrite(withRole("PRINCIPAL"), "ASSETS")).toBe(true); // FULL
  });

  it("is always true for super admins", () => {
    const ctx = withRole("EXTERNAL", { isSuperAdmin: true });
    expect(canWrite(ctx, "USERS")).toBe(true);
  });

  it("respects a FULL override even for a role that otherwise cannot write", () => {
    const ctx = withOverride("EXTERNAL", "EXPENSES", "FULL");
    expect(canWrite(ctx, "EXPENSES")).toBe(true);
  });
});

describe("isSuperAdmin / canManageUsers", () => {
  it("mirror the isSuperAdmin flag on the context", () => {
    expect(isSuperAdmin(makeUserContext({ isSuperAdmin: true }))).toBe(true);
    expect(isSuperAdmin(makeUserContext({ isSuperAdmin: false }))).toBe(false);
    expect(canManageUsers(makeUserContext({ isSuperAdmin: true }))).toBe(true);
    expect(canManageUsers(makeUserContext({ isSuperAdmin: false }))).toBe(false);
  });
});
