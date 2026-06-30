import type { UserContext } from "./types";
import { getModulePermission } from "./access";

export function assetEntityFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "ASSETS");
  if (level === "FULL" || level === "READ") return {};
  if (level === "FILTERED") return { entityId: { in: ctx.entityIds } };
  return { id: "__none__" };
}


export function landEntityFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "LANDS");
  if (level === "FULL" || level === "READ") return {};
  if (level === "FILTERED") return { entityId: { in: ctx.entityIds } };
  return { id: "__none__" };
}

export function carEntityFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "CARS");
  if (level === "FULL" || level === "READ") return {};
  if (level === "FILTERED") return { entityId: { in: ctx.entityIds } };
  return { id: "__none__" };
}

export function companyEntityFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "COMPANIES");
  if (level === "FULL" || level === "READ") return {};
  if (level === "FILTERED") return { entityId: { in: ctx.entityIds } };
  return { id: "__none__" };
}

export function documentFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "DOCUMENTS");
  if (level === "FULL" || level === "READ") return {};
  if (level === "FILTERED") {
    if (ctx.documentCategories.length === 0) return { id: "__none__" };
    return { category: { in: ctx.documentCategories as never[] } };
  }
  if (level === "SHARED_ONLY") return { id: "__none__" };
  return { id: "__none__" };
}

export function expenseEntityFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "EXPENSES");
  if (level === "FULL") return {};
  return { id: "__none__" };
}
