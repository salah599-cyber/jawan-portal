import type { CalendarItemKind } from "@/lib/calendar/types";

export type CalendarViewMode = "today" | "week" | "month" | "list";
export type CalendarView = CalendarViewMode;

export type MonthGridCell = {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
};

export function parseCalendarView(value?: string | null): CalendarViewMode {
  if (value === "week" || value === "month" || value === "list") return value;
  return "today";
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function endOfWeek(date: Date): Date {
  return endOfDay(addDays(startOfWeek(date), 6));
}

export function startOfMonth(date: Date): Date {
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function endOfMonth(date: Date): Date {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

export function calendarMonthGrid(date: Date): Date[] {
  const monthStart = startOfMonth(date);
  const gridStart = startOfWeek(monthStart);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export function buildMonthGrid(date: Date): MonthGridCell[] {
  const monthStart = startOfMonth(date);
  const todayKey = toDateKey(new Date());
  return calendarMonthGrid(date).map((cellDate) => ({
    date: cellDate,
    inMonth: cellDate.getMonth() === monthStart.getMonth(),
    isToday: toDateKey(cellDate) === todayKey,
  }));
}

export function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function formatWeekRangeLabel(anchor: Date): string {
  const start = startOfWeek(anchor);
  const end = endOfWeek(anchor);
  const startLabel = start.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const endLabel = end.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: start.getUTCFullYear() === end.getUTCFullYear() ? undefined : "numeric",
    timeZone: "UTC",
  });
  return `${startLabel} – ${endLabel}`;
}

export function weekDateKeys(anchor: Date): string[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, index) => toDateKey(addDays(start, index)));
}

export function parseAnchorDate(value?: string | null): Date {
  if (!value) return startOfDay(new Date());
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? startOfDay(new Date()) : startOfDay(parsed);
}

export function toDateKey(date: Date): string {
  return startOfDay(date).toISOString().slice(0, 10);
}

export function viewDateRange(view: CalendarViewMode, anchor: Date) {
  switch (view) {
    case "today":
      return { start: startOfDay(anchor), end: addDays(anchor, 7) };
    case "week":
      return { start: startOfWeek(anchor), end: endOfWeek(anchor) };
    case "month": {
      const start = startOfWeek(startOfMonth(anchor));
      const end = endOfDay(addDays(start, 41));
      return { start, end };
    }
    case "list":
      return { start: startOfDay(anchor), end: addDays(anchor, 90) };
    default:
      return { start: startOfDay(anchor), end: addDays(anchor, 7) };
  }
}

export const KIND_LABELS: Record<CalendarItemKind, string> = {
  CHEQUE_DUE: "Cheque",
  EXPENSE_DUE: "Expense",
  LOAN_MATURITY: "Loan",
  DOCUMENT_EXPIRY: "Document",
  INSURANCE_EXPIRY: "Insurance",
  VEHICLE_EXPIRY: "Vehicle",
  COMPANY_REGISTRATION: "Company",
  RE_RENT_DUE: "Rent",
  RE_LEASE_EXPIRY: "Lease",
  RE_MUNICIPALITY: "Municipality",
  RE_DOCUMENT_EXPIRY: "RE Document",
  PE_MONITORING_DUE: "PE Monitoring",
  LP_CAPITAL_CALL_DUE: "LP Capital Call",
  PROPOSAL_APPROVAL: "Proposal",
  CASH_STALE: "Cash",
  TASK: "Task",
};
