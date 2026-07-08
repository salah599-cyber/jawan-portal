import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { isBootstrapSuperAdminEmail } from "@/lib/auth/constants";
import { applyPendingInvite } from "@/lib/auth/apply-invite";
import { hasInviteAccess } from "@/lib/auth/invite-access";
import type { UserRole } from "@/lib/permissions/types";

function bootstrapData(email: string) {
  if (!isBootstrapSuperAdminEmail(email)) return {};
  return {
    isSuperAdmin: true,
    role: "PRINCIPAL" as UserRole,
    isActive: true,
  };
}

function getPrimaryEmail(clerkUser: {
  emailAddresses: { id: string; emailAddress: string }[];
  primaryEmailAddressId: string | null;
}): string | undefined {
  const primary = clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId);
  return primary?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;
}

export async function syncClerkUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = getPrimaryEmail(clerkUser);
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

    if (!existing.isSuperAdmin && isBootstrapSuperAdminEmail(email)) {
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
      role: isBootstrapSuperAdminEmail(email) ? "PRINCIPAL" : "EXTERNAL",
      isSuperAdmin: isBootstrapSuperAdminEmail(email),
      isActive: true,
    },
  });

  await applyPendingInvite(user.id, email).catch(() => null);
  return user;
}
