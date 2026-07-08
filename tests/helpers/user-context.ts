import type { ModuleName, PermissionLevel, UserContext, UserRole } from "@/lib/permissions/types";

export function makeUserContext(overrides: Partial<UserContext> = {}): UserContext {
  return {
    id: "user-1",
    clerkId: "clerk-1",
    email: "user@example.com",
    role: "EXTERNAL",
    isSuperAdmin: false,
    entityIds: [],
    documentCategories: [],
    overrides: {},
    ...overrides,
  };
}

export function withRole(role: UserRole, overrides: Partial<UserContext> = {}): UserContext {
  return makeUserContext({ role, ...overrides });
}

export function withOverride(
  role: UserRole,
  module: ModuleName,
  level: PermissionLevel,
  extra: Partial<UserContext> = {},
): UserContext {
  return makeUserContext({ role, ...extra, overrides: { [module]: level, ...extra.overrides } });
}
