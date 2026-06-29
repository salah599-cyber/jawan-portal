import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import type { UserRole } from "@/lib/permissions/types";

async function resolveRoleForNewUser(): Promise<UserRole> {
  const count = await db.user.count();
  return count === 0 ? "PRINCIPAL" : "EXTERNAL";
}

export async function syncClerkUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const existing = await db.user.findUnique({ where: { clerkId: clerkUser.id } });

  if (existing) {
    const userCount = await db.user.count();
    const role =
      userCount === 1 && existing.role === "EXTERNAL"
        ? ("PRINCIPAL" as UserRole)
        : (existing.role as UserRole);

    return db.user.update({
      where: { clerkId: clerkUser.id },
      data: {
        email,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        ...(role !== existing.role ? { role } : {}),
      },
    });
  }

  const role = await resolveRoleForNewUser();

  return db.user.create({
    data: {
      clerkId: clerkUser.id,
      email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      role,
    },
  });
}