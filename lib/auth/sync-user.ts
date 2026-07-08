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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function syncProfile(
  clerkUser: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  },
  email: string,
  existing?: { id: string; isSuperAdmin: boolean },
) {
  const normalizedEmail = normalizeEmail(email);
  const bootstrap = bootstrapData(normalizedEmail);

  const user = existing
    ? await db.user.update({
        where: { id: existing.id },
        data: {
          clerkId: clerkUser.id,
          email: normalizedEmail,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          ...bootstrap,
        },
      })
    : await db.user.create({
        data: {
          clerkId: clerkUser.id,
          email: normalizedEmail,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          role: isBootstrapSuperAdminEmail(normalizedEmail) ? "PRINCIPAL" : "EXTERNAL",
          isSuperAdmin: isBootstrapSuperAdminEmail(normalizedEmail),
          isActive: true,
        },
      });

  if (!existing?.isSuperAdmin && isBootstrapSuperAdminEmail(normalizedEmail)) {
    await applyPendingInvite(user.id, normalizedEmail).catch(() => null);
  } else if (!existing) {
    await applyPendingInvite(user.id, normalizedEmail).catch(() => null);
  }

  return user;
}

export async function syncClerkUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = getPrimaryEmail(clerkUser);
  if (!email) return null;

  const normalizedEmail = normalizeEmail(email);

  const existingByClerk = await db.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (existingByClerk) {
    return syncProfile(clerkUser, normalizedEmail, existingByClerk);
  }

  const existingByEmail = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (existingByEmail) {
    return syncProfile(clerkUser, normalizedEmail, existingByEmail);
  }

  if (!(await hasInviteAccess(normalizedEmail))) {
    return null;
  }

  return syncProfile(clerkUser, normalizedEmail);
}
