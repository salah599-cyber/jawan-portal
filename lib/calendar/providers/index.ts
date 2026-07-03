import type { CalendarItem } from "@/lib/calendar/types";
import type { UserContext } from "@/lib/permissions/types";
import { getChequeCalendarItems } from "@/lib/calendar/providers/cheques";
import { getDocumentCalendarItems } from "@/lib/calendar/providers/documents";
import { getExpenseCalendarItems } from "@/lib/calendar/providers/expenses";
import { getLoanCalendarItems } from "@/lib/calendar/providers/loans";

export async function getSystemCalendarItems(ctx: UserContext): Promise<CalendarItem[]> {
  const batches = await Promise.all([
    getChequeCalendarItems(ctx),
    getExpenseCalendarItems(ctx),
    getLoanCalendarItems(ctx),
    getDocumentCalendarItems(ctx),
  ]);

  return batches.flat().sort((a, b) => a.date.getTime() - b.date.getTime());
}
