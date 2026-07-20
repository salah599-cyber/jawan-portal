"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { applyUserAccess, type InviteConfig } from "@/lib/auth/apply-invite";
import { createClerkInvitation } from "@/lib/auth/clerk-invite";
import { restoreClerkUser, suspendClerkUser } from "@/lib/auth/clerk-user-access";
import { logAudit } from "@/lib/audit/log";
import { ensureUsersSchema } from "@/lib/db/ensure-users-schema";
import { requireSuperAdmin } from "@/lib/permissions/access";
import type { ModuleName, PermissionLevel } from "@/lib/generated/prisma/client";
import type { UserAccessInput } from "@/lib/admin/user-options";

export type { UserAccessInput } from "@/lib/admin/user-options";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toInviteConfig(input: UserAccessInput): InviteConfig {
  return {
    role: input.role,
    isSuperAdmin: input.isSuperAdmin,
    entityIds: input.entityIds,
    moduleOverrides: input.moduleOverrides as Partial<Record<ModuleName, PermissionLevel>>,
    documentCategories: input.documentCategories,
  };
}

export async function inviteUser(input: UserAccessInput) {
  const ctx = await requireSuperAdmin();

  try {
    await ensureUsersSchema();
    const email = normalizeEmail(input.email ?? "");
    if (!email) throw new Error("Email is required.");

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) throw new Error("A user with this email already exists.");

    const config = toInviteConfig(input);

    const invite = await db.pendingUserInvite.upsert({
      where: { email },
      create: {
        email,
        role: config.role,
        isSuperAdmin: config.isSuperAdmin,
        entityIds: config.entityIds,
        moduleOverrides: config.moduleOverrides,
        documentCategories: config.documentCategories,
        invitedById: ctx.id,
      },
      update: {
        role: config.role,
        isSuperAdmin: config.isSuperAdmin,
        entityIds: config.entityIds,
        moduleOverrides: config.moduleOverrides,
        documentCategories: config.documentCategories,
        invitedById: ctx.id,
        acceptedAt: null,
      },
    });

    const invitation = await createClerkInvitation(email, invite.id);

    await db.pendingUserInvite.update({
      where: { id: invite.id },
      data: { clerkInvitationId: invitation.id },
    });

    await logAudit({
      userId: ctx.id,
      action: "INVITE",
      resource: "User",
      resourceId: invite.id,
      metadata: { email, role: config.role, isSuperAdmin: config.isSuperAdmin },
    }).catch(() => {
      // Audit logging should not block a successful invitation.
    });

    revalidatePath("/admin/users");
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Failed to send invitation.");
  }
}

export async function updateUserAccess(userId: string, input: UserAccessInput) {
  const ctx = await requireSuperAdmin();

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found.");

  if (user.id === ctx.id && !input.isSuperAdmin) {
    const superAdminCount = await db.user.count({ where: { isSuperAdmin: true, isActive: true } });
    if (superAdminCount <= 1) {
      throw new Error("You cannot remove super admin status from the last super admin.");
    }
  }

  const config = toInviteConfig(input);
  await applyUserAccess(userId, config);

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "User",
    resourceId: userId,
    metadata: { email: user.email, role: config.role, isSuperAdmin: config.isSuperAdmin },
  });

  revalidatePath("/admin/users");
}

export async function setSuperAdmin(userId: string, value: boolean) {
  const ctx = await requireSuperAdmin();

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found.");

  if (user.id === ctx.id && !value) {
    const superAdminCount = await db.user.count({ where: { isSuperAdmin: true, isActive: true } });
    if (superAdminCount <= 1) {
      throw new Error("You cannot remove super admin status from the last super admin.");
    }
  }

  await db.user.update({
    where: { id: userId },
    data: { isSuperAdmin: value },
  });

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "User",
    resourceId: userId,
    metadata: { isSuperAdmin: value, email: user.email },
  });

  revalidatePath("/admin/users");
}

export async function deactivateUser(userId: string) {
  const ctx = await requireSuperAdmin();

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found.");
  if (user.id === ctx.id) throw new Error("You cannot deactivate your own account.");

  if (user.isSuperAdmin) {
    const superAdminCount = await db.user.count({
      where: { isSuperAdmin: true, isActive: true, id: { not: userId } },
    });
    if (superAdminCount === 0) {
      throw new Error("You cannot deactivate the last active super admin.");
    }
  }

  await db.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  await suspendClerkUser(user.clerkId);

  await logAudit({
    userId: ctx.id,
    action: "DEACTIVATE",
    resource: "User",
    resourceId: userId,
    metadata: { email: user.email },
  });

  revalidatePath("/admin/users");
}

export async function reactivateUser(userId: string) {
  const ctx = await requireSuperAdmin();

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found.");

  await db.user.update({
    where: { id: userId },
    data: { isActive: true },
  });

  await restoreClerkUser(user.clerkId);

  await logAudit({
    userId: ctx.id,
    action: "REACTIVATE",
    resource: "User",
    resourceId: userId,
    metadata: { email: user.email },
  });

  revalidatePath("/admin/users");
}

export async function cancelPendingInvite(inviteId: string) {
  const ctx = await requireSuperAdmin();
  await ensureUsersSchema();
  const invite = await db.pendingUserInvite.findUnique({ where: { id: inviteId } });
  if (!invite || invite.acceptedAt) throw new Error("Pending invite not found.");

  if (invite.clerkInvitationId) {
    try {
      const clerk = await clerkClient();
      await clerk.invitations.revokeInvitation(invite.clerkInvitationId);
    } catch {
      // Invitation may already be accepted or revoked.
    }
  }

  await db.pendingUserInvite.delete({ where: { id: inviteId } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "PendingUserInvite",
    resourceId: inviteId,
    metadata: { email: invite.email },
  });

  revalidatePath("/admin/users");
}

export async function resendPendingInvite(inviteId: string) {
  const ctx = await requireSuperAdmin();
  await ensureUsersSchema();

  const invite = await db.pendingUserInvite.findUnique({ where: { id: inviteId } });
  if (!invite || invite.acceptedAt) throw new Error("Pending invite not found.");

  const existingUser = await db.user.findUnique({ where: { email: invite.email } });
  if (existingUser) throw new Error("A user with this email already exists.");

  const invitation = await createClerkInvitation(invite.email, invite.id);

  await db.pendingUserInvite.update({
    where: { id: invite.id },
    data: {
      clerkInvitationId: invitation.id,
      invitedById: ctx.id,
      createdAt: new Date(),
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "INVITE",
    resource: "User",
    resourceId: invite.id,
    metadata: { email: invite.email, resend: true },
  }).catch(() => {
    // Audit logging should not block a successful resend.
  });

  revalidatePath("/admin/users");
}
