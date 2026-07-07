import { db } from "@/lib/db";
import {
  serializePendingInvite,
  serializeUser,
  type SerializedPendingInviteRow,
  type SerializedUserRow,
} from "@/lib/admin/users-serialization";
import { ensureUsersSchema } from "@/lib/db/ensure-users-schema";
import { requireSuperAdmin } from "@/lib/permissions/access";

export type { SerializedPendingInviteRow, SerializedUserRow };

export async function listUsers(): Promise<SerializedUserRow[]> {
  await requireSuperAdmin();
  await ensureUsersSchema();
  const users = await db.user.findMany({
    include: {
      entityAccess: { include: { entity: true } },
      permissionOverrides: true,
      documentScopes: { include: { category: true } },
    },
    orderBy: [{ isSuperAdmin: "desc" }, { email: "asc" }],
  });

  return users.map(serializeUser);
}

export async function listPendingInvites(): Promise<SerializedPendingInviteRow[]> {
  await requireSuperAdmin();
  await ensureUsersSchema();
  const invites = await db.pendingUserInvite.findMany({
    where: { acceptedAt: null },
    orderBy: { createdAt: "desc" },
  });

  return invites.map(serializePendingInvite);
}
