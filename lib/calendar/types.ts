import type { ModuleName } from "@/lib/permissions/types";

export type CalendarItemSource = "SYSTEM" | "MANUAL";

export type CalendarItemKind =
  | "CHEQUE_DUE"
  | "EXPENSE_DUE"
  | "LOAN_MATURITY"
  | "DOCUMENT_EXPIRY"
  | "TASK";

export type CalendarItemSeverity = "info" | "warning" | "danger";

export type CalendarItemStatus =
  | "UPCOMING"
  | "DUE_TODAY"
  | "OVERDUE"
  | "COMPLETED"
  | "CANCELLED";

export type CalendarItem = {
  id: string;
  source: CalendarItemSource;
  kind: CalendarItemKind;
  title: string;
  subtitle?: string;
  date: Date;
  severity: CalendarItemSeverity;
  status: CalendarItemStatus;
  href?: string;
  entityId?: string | null;
  entityName?: string | null;
  module: ModuleName;
  assigneeId?: string | null;
  assigneeName?: string | null;
  priority?: string | null;
  completedAt?: Date | null;
  completionNotes?: string | null;
  taskId?: string;
};

export type TodayView = {
  overdue: CalendarItem[];
  dueToday: CalendarItem[];
  upcoming: CalendarItem[];
  assignedToMe: CalendarItem[];
  counts: {
    overdue: number;
    dueToday: number;
    upcoming: number;
    assignedToMe: number;
  };
};

export type CalendarFilters = {
  entityId?: string;
  start?: Date;
  end?: Date;
};

export type AssignableUser = {
  id: string;
  name: string;
  email: string;
};

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date;
  status: string;
  priority: string;
  entityId: string | null;
  entityName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  createdById: string;
  createdByName: string;
  completedAt: Date | null;
  completionNotes: string | null;
};
