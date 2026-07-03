import { db } from "@/lib/db";
import { buildSystemItem } from "@/lib/calendar/helpers";
import type { CalendarItem } from "@/lib/calendar/types";
import { addDays } from "@/lib/calendar/status";
import { canAccess } from "@/lib/permissions/access";
import { proposalEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";

export async function getProposalCalendarItems(ctx: UserContext): Promise<CalendarItem[]> {
  if (!canAccess(ctx, "PROPOSALS")) return [];

  const now = new Date();
  const horizon = addDays(now, 14);

  const proposals = await db.investmentProposal.findMany({
    where: {
      ...proposalEntityFilter(ctx),
      status: "PENDING",
      approvers: { some: { userId: ctx.id, decision: null } },
      submittedAt: { not: null },
    },
    select: {
      id: true,
      name: true,
      submittedAt: true,
      entityId: true,
      entity: { select: { name: true } },
    },
    orderBy: { submittedAt: "asc" },
    take: 20,
  });

  return proposals
    .filter((proposal) => proposal.submittedAt)
    .map((proposal) => {
      const submittedAt = proposal.submittedAt!;
      const followUpDate = addDays(submittedAt, 7);
      const date = followUpDate <= horizon ? followUpDate : submittedAt;

      return buildSystemItem({
        id: `system:proposal:${proposal.id}`,
        kind: "PROPOSAL_APPROVAL",
        module: "PROPOSALS",
        title: proposal.name,
        subtitle: "Awaiting your approval",
        date,
        href: `/proposals/${proposal.id}`,
        entityId: proposal.entityId,
        entityName: proposal.entity?.name,
      });
    });
}
