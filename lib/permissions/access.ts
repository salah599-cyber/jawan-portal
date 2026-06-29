import { auth } from "@clerk/nextjs/server";
import { forbidden } from "next/navigation";
import { db } from "@/lib/db";
import { ROLE_MATRIX } from "./matrix";
import type { ModuleName, PermissionLevel, UserContext } from "./types";

export async function getCurrentUserContext(): Promise<UserContext | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: {
      entityAccess: true,
      documentScopes: true,
      permissionOverrides: true,
    },
  });

  if (!user || !user.isActive) return null;

  const overrides: Partial<Record<ModuleName, PermissionLevel>> = {};
  for (const o of user.permissionOverrides) {
    overrides[o.module as ModuleName] = o.level as PermissionLevel;
  }

  return {
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    role: user.role as UserContext["role"],
    entityIds: user.entityAccess.map((e) => e.entityId),
    documentCategories: user.documentScopes.map((d) => d.category),
    overrides,
  };
}

export function getModulePermission(
  ctx: UserContext,
  module: ModuleName,
): PermissionLevel {
  return ctx.overrides[module] ?? ROLE_MATRIX[ctx.role][module];
}

export function canAccess(ctx: UserContext, module: ModuleName): boolean {
  const level = getModulePermission(ctx, module);
  return level !== "NONE";
}

export function canWrite(ctx: UserContext, module: ModuleName): boolean {
  return getModulePermission(ctx, module) === "FULL";
}

export async function requireUserContext(): Promise<UserContext> {
  const ctx = await getCurrentUserContext();
  if (!ctx) forbidden();
  return ctx;
}

export async function requireModuleAccess(module: ModuleName): Promise<UserContext> {
  const ctx = await requireUserContext();
  if (!canAccess(ctx, module)) forbidden();
  return ctx;
}