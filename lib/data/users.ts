import { db } from "@/lib/db";
import { ensureUsersSchema } from "@/lib/db/ensure-users-schema";
import { requireSuperAdmin } from "@/lib/permissions/access";

export async function listUsers() {
  await requireSuperAdmin();
  await ensureUsersSchema();
  return db.user.findMany({
    include: {
      entityAccess: { include: { entity: true } },
      permissionOverrides: true,
      documentScopes: { include: { category: true } },
    },
    orderBy: [{ isSuperAdmin: "desc" }, { email: "asc" }],
  });
}

export async function listPendingInvites() {
  await requireSuperAdmin();
  await ensureUsersSchema();
  return db.pendingUserInvite.findMany({
    where: { acceptedAt: null },
    orderBy: { createdAt: "desc" },
  });
}
