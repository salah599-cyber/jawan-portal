import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { SUPER_ADMIN_EMAIL } from "@/lib/auth/constants";
import { applyPendingInvite } from "@/lib/auth/apply-invite";
import { hasInviteAccess } from "@/lib/auth/invite-access";
import type { UserRole } from "@/lib/permissions/types";

function isBootstrapSuperAdmin(email: string) {
  return email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

function bootstrapData(email: string) {
  if (!isBootstrapSuperAdmin(email)) return {};
  return {
    isSuperAdmin: true,
    role: "PRINCIPAL" as UserRole,
    isActive: true,
  };
}

export async function syncClerkUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const existing = await db.user.findUnique({ where: { clerkId: clerkUser.id } });

  if (existing) {
    const user = await db.user.update({
      where: { clerkId: clerkUser.id },
      data: {
        email,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        ...bootstrapData(email),
      },
    });

    if (!existing.isSuperAdmin && isBootstrapSuperAdmin(email)) {
      await applyPendingInvite(user.id, email).catch(() => null);
    }

    return user;
  }

  if (!(await hasInviteAccess(email))) {
    return null;
  }

  const user = await db.user.create({
    data: {
      clerkId: clerkUser.id,
      email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      role: isBootstrapSuperAdmin(email) ? "PRINCIPAL" : "EXTERNAL",
      isSuperAdmin: isBootstrapSuperAdmin(email),
      isActive: true,
    },
  });

  await applyPendingInvite(user.id, email).catch(() => null);
  return user;
}
