import { getModulePermission } from "@/lib/permissions/access";
import type { UserContext } from "@/lib/permissions/types";

export type ViewableProposal = {
  submittedById: string;
  entityId: string | null;
  approvers: { userId: string }[];
};

/**
 * Throws if `ctx` may not view `proposal`. Shared between the proposal server actions
 * and the authenticated file download route so both enforce identical access rules.
 */
export function assertCanViewProposal(ctx: UserContext, proposal: ViewableProposal): void {
  if (proposal.submittedById === ctx.id) return;
  if (proposal.approvers.some((a) => a.userId === ctx.id)) return;

  const level = getModulePermission(ctx, "PROPOSALS");
  if (level === "NONE") throw new Error("Forbidden");

  if (
    level === "FILTERED" &&
    proposal.entityId &&
    ctx.entityIds.length > 0 &&
    !ctx.entityIds.includes(proposal.entityId) &&
    ctx.role !== "PRINCIPAL" &&
    !ctx.isSuperAdmin
  ) {
    throw new Error("You do not have access to this proposal.");
  }
}
