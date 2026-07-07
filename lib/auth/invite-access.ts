import { db } from "@/lib/db";
import { SUPER_ADMIN_EMAIL } from "@/lib/auth/constants";
import { ensureUsersSchema } from "@/lib/db/ensure-users-schema";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isBootstrapSuperAdmin(email: string) {
  return normalizeEmail(email) === SUPER_ADMIN_EMAIL.toLowerCase();
}

export async function hasInviteAccess(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (isBootstrapSuperAdmin(normalized)) return true;

  const existingUser = await db.user.findUnique({ where: { email: normalized } });
  if (existingUser) return true;

  try {
    await ensureUsersSchema();
    const pendingInvite = await db.pendingUserInvite.findFirst({
      where: { email: normalized, acceptedAt: null },
    });
    return Boolean(pendingInvite);
  } catch {
    return false;
  }
}
