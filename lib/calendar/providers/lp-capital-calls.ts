import { db } from "@/lib/db";
import { ensureLpFundSchema } from "@/lib/db/ensure-lp-fund-schema";
import { buildSystemItem } from "@/lib/calendar/helpers";
import type { CalendarItem } from "@/lib/calendar/types";
import { canAccess } from "@/lib/permissions/access";
import { lpCommitmentEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";
import { addDays } from "@/lib/calendar/status";
import { LP_PATH } from "@/lib/lp/constants";

export async function getLpCapitalCallCalendarItems(ctx: UserContext): Promise<CalendarItem[]> {
  if (!canAccess(ctx, "FUND_LP")) return [];

  await ensureLpFundSchema();

  const now = new Date();
  const horizon = addDays(now, 30);

  const calls = await db.lpCapitalCall.findMany({
    where: {
      status: { in: ["PENDING", "OVERDUE"] },
      dueDate: { not: null, lte: horizon },
      commitment: lpCommitmentEntityFilter(ctx),
    },
    include: {
      commitment: {
        include: {
          fund: { select: { name: true } },
          entity: { select: { name: true } },
        },
      },
    },
    take: 50,
    orderBy: { dueDate: "asc" },
  });

  return calls
    .filter((call) => call.dueDate)
    .map((call) =>
      buildSystemItem({
        id: `system:lp-capital-call:${call.id}`,
        kind: "LP_CAPITAL_CALL_DUE",
        module: "FUND_LP",
        title: call.commitment.fund.name,
        subtitle: `Capital call due · ${call.commitment.entity.name}`,
        date: call.dueDate!,
        href: `${LP_PATH}/${call.commitmentId}?tab=capital-calls`,
        entityId: call.commitment.entityId,
        entityName: call.commitment.entity?.name,
      }),
    );
}
