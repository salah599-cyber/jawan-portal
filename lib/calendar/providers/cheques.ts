import { db } from "@/lib/db";
import { buildSystemItem } from "@/lib/calendar/helpers";
import type { CalendarItem } from "@/lib/calendar/types";
import { canAccess } from "@/lib/permissions/access";
import { chequeEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";
import { addDays } from "@/lib/calendar/status";

export async function getChequeCalendarItems(ctx: UserContext): Promise<CalendarItem[]> {
  if (!canAccess(ctx, "CHEQUES")) return [];

  const now = new Date();
  const horizon = addDays(now, 7);

  const cheques = await db.cheque.findMany({
    where: {
      ...chequeEntityFilter(ctx),
      status: { in: ["PENDING", "DEPOSITED"] },
      dueDate: { not: null, lte: horizon },
    },
    select: {
      id: true,
      chequeNumber: true,
      payee: true,
      dueDate: true,
      direction: true,
      entityId: true,
      entity: { select: { name: true } },
    },
    take: 50,
  });

  return cheques
    .filter((cheque) => cheque.dueDate)
    .map((cheque) =>
      buildSystemItem({
        id: `system:cheque:${cheque.id}`,
        kind: "CHEQUE_DUE",
        module: "CHEQUES",
        title: `Cheque #${cheque.chequeNumber}`,
        subtitle:
          (cheque.direction === "ISSUED" ? "Due · " : "Incoming · ") + cheque.payee,
        date: cheque.dueDate!,
        href: `/cheques/${cheque.id}`,
        entityId: cheque.entityId,
        entityName: cheque.entity?.name,
      }),
    );
}
