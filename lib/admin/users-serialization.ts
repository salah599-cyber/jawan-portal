import type { PendingUserInvite, User } from "@/lib/generated/prisma/client";
import type { ModuleName, PermissionLevel } from "@/lib/permissions/types";

export type SerializedUserRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: User["role"];
  isSuperAdmin: boolean;
  isActive: boolean;
  updatedAt: string;
  entityAccess: { entityId: string; entity: { name: string } }[];
  permissionOverrides: { module: ModuleName; level: PermissionLevel }[];
  documentScopes: { categoryId: string; category: { id: string; name: string } }[];
};

export type SerializedPendingInviteRow = {
  id: string;
  email: string;
  role: PendingUserInvite["role"];
  isSuperAdmin: boolean;
  createdAt: string;
};

export function serializeUser(
  user: User & {
    entityAccess: { entityId: string; entity: { name: string } }[];
    permissionOverrides: { module: string; level: string }[];
    documentScopes: { categoryId: string; category: { id: string; name: string } }[];
  },
): SerializedUserRow {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
    isActive: user.isActive,
    updatedAt: user.updatedAt.toISOString(),
    entityAccess: user.entityAccess.map((access) => ({
      entityId: access.entityId,
      entity: { name: access.entity.name },
    })),
    permissionOverrides: user.permissionOverrides.map((override) => ({
      module: override.module as ModuleName,
      level: override.level as PermissionLevel,
    })),
    documentScopes: user.documentScopes.map((scope) => ({
      categoryId: scope.categoryId,
      category: { id: scope.category.id, name: scope.category.name },
    })),
  };
}

export function serializePendingInvite(invite: PendingUserInvite): SerializedPendingInviteRow {
  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    isSuperAdmin: invite.isSuperAdmin,
    createdAt: invite.createdAt.toISOString(),
  };
}
