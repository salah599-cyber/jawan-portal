import { db } from "@/lib/db";
import { buildSystemItem } from "@/lib/calendar/helpers";
import type { CalendarItem } from "@/lib/calendar/types";
import { addDays } from "@/lib/calendar/status";
import { canAccess } from "@/lib/permissions/access";
import { loanEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";

export async function getLoanCalendarItems(ctx: UserContext): Promise<CalendarItem[]> {
  if (!canAccess(ctx, "LOANS")) return [];

  const now = new Date();
  const horizon = addDays(now, 30);

  const loans = await db.liability.findMany({
    where: {
      ...loanEntityFilter(ctx),
      status: "ACTIVE",
      maturityDate: { not: null, lte: horizon },
    },
    select: {
      id: true,
      name: true,
      lender: true,
      maturityDate: true,
      entityId: true,
      entity: { select: { name: true } },
    },
    take: 50,
  });

  return loans
    .filter((loan) => loan.maturityDate)
    .map((loan) =>
      buildSystemItem({
        id: `system:loan:${loan.id}`,
        kind: "LOAN_MATURITY",
        module: "LOANS",
        title: loan.name,
        subtitle: "Loan maturity" + (loan.lender ? ` · ${loan.lender}` : ""),
        date: loan.maturityDate!,
        href: `/loans/${loan.id}`,
        entityId: loan.entityId,
        entityName: loan.entity?.name,
      }),
    );
}
