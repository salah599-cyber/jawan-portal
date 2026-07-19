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

export function loanEntityFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "LOANS");
  if (level === "FULL" || level === "READ") return {};
  if (level === "FILTERED") return { entityId: { in: ctx.entityIds } };
  return { id: "__none__" };
}

/** Loans visible when linking a mortgage on a private property (falls back to REAL_ESTATE access). */
export function linkableMortgageLoanFilter(ctx: UserContext) {
  const loansLevel = getModulePermission(ctx, "LOANS");
  if (loansLevel !== "NONE") return loanEntityFilter(ctx);
  return rePropertyEntityFilter(ctx);
}

export function chequeEntityFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "CHEQUES");
  const notDeleted = { deletedAt: null };
  if (level === "FULL" || level === "READ") return notDeleted;
  if (level === "FILTERED") return { ...notDeleted, entityId: { in: ctx.entityIds } };
  return { id: "__none__" };
}

export function peCompanyEntityFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "PRIVATE_EQUITY");
  if (level === "FULL" || level === "READ") return {};
  if (level === "FILTERED") return { entityId: { in: ctx.entityIds } };
  return { id: "__none__" };
}

export function lpCommitmentEntityFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "FUND_LP");
  if (level === "FULL" || level === "READ") return {};
  if (level === "FILTERED") return { entityId: { in: ctx.entityIds } };
  return { id: "__none__" };
}

export function rePropertyEntityFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "REAL_ESTATE");
  if (level === "FULL" || level === "READ") return {};
  if (level === "FILTERED") return { entityId: { in: ctx.entityIds } };
  return { id: "__none__" };
}

export function proposalEntityFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "PROPOSALS");
  if (level === "FULL" || level === "READ") return {};
  if (level === "FILTERED") {
    return { OR: [{ entityId: null }, { entityId: { in: ctx.entityIds } }] };
  }
  return { id: "__none__" };
}

export function documentFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "DOCUMENTS");
  if (level === "FULL" || level === "READ") return {};
  if (level === "FILTERED") {
    if (ctx.documentCategories.length === 0) return { id: "__none__" };
    return { categoryId: { in: ctx.documentCategories } };
  }
  if (level === "SHARED_ONLY") return { id: "__none__" };
  return { id: "__none__" };
}

export function insurancePolicyEntityFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "INSURANCE");
  if (level === "FULL" || level === "READ") return {};
  if (level === "FILTERED") return { entityId: { in: ctx.entityIds } };
  return { id: "__none__" };
}

export function expenseEntityFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "EXPENSES");
  if (level === "FULL" || level === "READ") return {};
  if (level === "FILTERED") {
    return { OR: [{ entityId: null }, { entityId: { in: ctx.entityIds } }] };
  }
  return { id: "__none__" };
}

export function familyMemberFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "FAMILY_MEMBERS");
  if (level === "FULL") return {};
  return { id: "__none__" };
}

export function successionPlanFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "SUCCESSION");
  if (level === "FULL") return {};
  return { id: "__none__" };
}

export function contactEntityFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "CONTACTS");
  if (level === "FULL" || level === "READ") return {};
  if (level === "FILTERED") {
    return { OR: [{ entityId: null }, { entityId: { in: ctx.entityIds } }] };
  }
  return { id: "__none__" };
}

export function reportsEntityFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "REPORTS");
  if (level === "FULL" || level === "READ") return {};
  if (level === "FILTERED") return { id: { in: ctx.entityIds } };
  return { id: "__none__" };
}

export function cashBankAccountFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "CASH_MANAGEMENT");
  if (level === "FULL" || level === "READ") return { isActive: true };
  if (level === "FILTERED") {
    return {
      isActive: true,
      OR: [{ entityId: null }, { entityId: { in: ctx.entityIds } }],
    };
  }
  return { id: "__none__" };
}

/** Active bank accounts tracked in Cash Management (excludes reference-only registry entries). */
export function cashPositionBankAccountFilter(ctx: UserContext) {
  return {
    ...cashBankAccountFilter(ctx),
    includeInCashPosition: true,
  };
}

export function taskEntityFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "CALENDAR");
  if (level === "FULL" || level === "READ") return {};
  if (level === "FILTERED") {
    return {
      OR: [
        { entityId: null },
        { entityId: { in: ctx.entityIds } },
        { assigneeId: ctx.id },
        { createdById: ctx.id },
      ],
    };
  }
  return { id: "__none__" };
}
