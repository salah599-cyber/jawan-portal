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

  const [users, categories] = await Promise.all([
    db.user.findMany({
      include: {
        entityAccess: { include: { entity: true } },
        permissionOverrides: true,
        documentScopes: true,
      },
      orderBy: [{ isSuperAdmin: "desc" }, { email: "asc" }],
    }),
    db.documentCategoryRecord.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    }),
  ]);

  const categoryLookup = new Map(categories.map((category) => [category.id, category]));
  return users.map((user) => serializeUser(user, categoryLookup));
}

export async function listPendingInvites(): Promise<SerializedPendingInviteRow[]> {
  await requireSuperAdmin();

  try {
    await ensureUsersSchema();
    const invites = await db.pendingUserInvite.findMany({
      where: { acceptedAt: null },
      orderBy: { createdAt: "desc" },
    });

    return invites.map(serializePendingInvite);
  } catch (error) {
    console.error("listPendingInvites failed:", error);
    return [];
  }
}
