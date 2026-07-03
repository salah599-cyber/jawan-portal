import { db } from "@/lib/db";
import { buildSystemItem } from "@/lib/calendar/helpers";
import type { CalendarItem } from "@/lib/calendar/types";
import { canAccess } from "@/lib/permissions/access";
import { expenseEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";
import { formatMoney } from "@/lib/format";

export async function getExpenseCalendarItems(ctx: UserContext): Promise<CalendarItem[]> {
  if (!canAccess(ctx, "EXPENSES")) return [];

  const expenses = await db.expense.findMany({
    where: {
      ...expenseEntityFilter(ctx),
      status: { in: ["PENDING", "OVERDUE"] },
      dueDate: { not: null },
    },
    select: {
      id: true,
      title: true,
      status: true,
      dueDate: true,
      amount: true,
      currency: true,
      entityId: true,
      entity: { select: { name: true } },
    },
    orderBy: { dueDate: "asc" },
    take: 50,
  });

  return expenses
    .filter((expense) => expense.dueDate)
    .map((expense) =>
      buildSystemItem({
        id: `system:expense:${expense.id}`,
        kind: "EXPENSE_DUE",
        module: "EXPENSES",
        title: expense.title,
        subtitle:
          (expense.status === "OVERDUE" ? "Overdue · " : "Due · ") +
          formatMoney(expense.amount, expense.currency),
        date: expense.dueDate!,
        href: `/expenses/${expense.id}`,
        entityId: expense.entityId,
        entityName: expense.entity?.name,
      }),
    );
}
