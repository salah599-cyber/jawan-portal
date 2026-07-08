import { db } from "@/lib/db";
import { isBootstrapSuperAdminEmail } from "@/lib/auth/constants";
import { ensureUsersSchema } from "@/lib/db/ensure-users-schema";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function hasInviteAccess(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (isBootstrapSuperAdminEmail(normalized)) return true;

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
