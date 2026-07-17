import { auth } from "@clerk/nextjs/server";
import { forbidden, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ROLE_MATRIX } from "./matrix";
import { ALL_MODULE_NAMES } from "./modules";
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
    isSuperAdmin: user.isSuperAdmin,
    entityIds: user.entityAccess.map((e) => e.entityId),
    documentCategories: user.documentScopes.map((d) => d.categoryId),
    overrides,
  };
}

export function isSuperAdmin(ctx: UserContext): boolean {
  return ctx.isSuperAdmin;
}

export function canManageUsers(ctx: UserContext): boolean {
  return ctx.isSuperAdmin;
}

export function getModulePermission(
  ctx: UserContext,
  module: ModuleName,
): PermissionLevel {
  if (ctx.isSuperAdmin) return "FULL";
  return ctx.overrides[module] ?? ROLE_MATRIX[ctx.role][module];
}

export function canAccess(ctx: UserContext, module: ModuleName): boolean {
  if (ctx.isSuperAdmin) return true;
  const level = getModulePermission(ctx, module);
  return level !== "NONE";
}

export function canWrite(ctx: UserContext, module: ModuleName): boolean {
  if (ctx.isSuperAdmin) return true;
  return getModulePermission(ctx, module) === "FULL";
}

export function buildModuleAccessMap(ctx: UserContext): Record<ModuleName, boolean> {
  const access = {} as Record<ModuleName, boolean>;
  for (const module of ALL_MODULE_NAMES) {
    access[module] = canAccess(ctx, module);
  }
  return access;
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

export async function getUserContextById(userId: string): Promise<UserContext | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
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
    isSuperAdmin: user.isSuperAdmin,
    entityIds: user.entityAccess.map((e) => e.entityId),
    documentCategories: user.documentScopes.map((d) => d.categoryId),
    overrides,
  };
}

export async function requireSuperAdmin(): Promise<UserContext> {
  const ctx = await requireUserContext();
  if (!canManageUsers(ctx)) redirect("/dashboard");
  return ctx;
}
