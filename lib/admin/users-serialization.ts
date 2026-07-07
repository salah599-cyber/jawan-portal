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

type CategoryLookup = Map<string, { id: string; name: string }>;

export function toClientProps<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function serializeUser(
  user: User & {
    entityAccess: { entityId: string; entity: { name: string } | null }[];
    permissionOverrides: { module: string; level: string }[];
    documentScopes: { categoryId: string; category?: { id: string; name: string } | null }[];
  },
  categoryLookup?: CategoryLookup,
): SerializedUserRow {
  return {
    id: String(user.id),
    email: String(user.email),
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    role: user.role,
    isSuperAdmin: Boolean(user.isSuperAdmin),
    isActive: Boolean(user.isActive),
    updatedAt: user.updatedAt.toISOString(),
    entityAccess: user.entityAccess
      .filter((access) => access.entity?.name)
      .map((access) => ({
        entityId: access.entityId,
        entity: { name: access.entity!.name },
      })),
    permissionOverrides: user.permissionOverrides.map((override) => ({
      module: String(override.module) as ModuleName,
      level: String(override.level) as PermissionLevel,
    })),
    documentScopes: user.documentScopes
      .map((scope) => {
        const category = scope.category ?? categoryLookup?.get(scope.categoryId);
        if (!category) return null;
        return {
          categoryId: scope.categoryId,
          category: { id: category.id, name: category.name },
        };
      })
      .filter((scope): scope is NonNullable<typeof scope> => scope !== null),
  };
}

export function serializePendingInvite(invite: PendingUserInvite): SerializedPendingInviteRow {
  return {
    id: String(invite.id),
    email: String(invite.email),
    role: invite.role,
    isSuperAdmin: Boolean(invite.isSuperAdmin),
    createdAt: invite.createdAt.toISOString(),
  };
}
