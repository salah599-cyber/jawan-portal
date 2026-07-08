import { db } from "@/lib/db";
import { ensureCalendarSchema } from "@/lib/db/ensure-calendar-schema";
import { aggregateCalendarItems, loadSystemCalendarItems } from "@/lib/calendar/aggregate";
import { addDays, resolveItemStatus, resolveSeverity, startOfDay } from "@/lib/calendar/status";
import { toDateKey, viewDateRange, type CalendarViewMode } from "@/lib/calendar/date-ranges";
import type {
  AssignableUser,
  CalendarCounts,
  CalendarFilters,
  CalendarItem,
  TaskRow,
  TodayView,
} from "@/lib/calendar/types";
import { taskEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";

function displayName(user: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.email;
}

function mapTaskToCalendarItem(
  task: Awaited<ReturnType<typeof db.task.findMany>>[number] & {
    entity: { name: string } | null;
    assignee: { id: string; firstName: string | null; lastName: string | null; email: string } | null;
  },
): CalendarItem {
  const status =
    task.status === "COMPLETED"
      ? "COMPLETED"
      : task.status === "CANCELLED"
        ? "CANCELLED"
        : resolveItemStatus(task.dueDate);

  return {
    id: `manual:task:${task.id}`,
    taskId: task.id,
    source: "MANUAL",
    kind: "TASK",
    module: "CALENDAR",
    title: task.title,
    subtitle: task.description ?? undefined,
    date: task.dueDate,
    severity:
      task.status === "COMPLETED" || task.status === "CANCELLED"
        ? "info"
        : resolveSeverity(task.dueDate),
    status,
    entityId: task.entityId,
    entityName: task.entity?.name ?? null,
    assigneeId: task.assigneeId,
    assigneeName: task.assignee ? displayName(task.assignee) : null,
    priority: task.priority,
    completedAt: task.completedAt,
    completionNotes: task.completionNotes,
  };
}

async function ensureReady() {
  await ensureCalendarSchema();
}

export async function listAssignableUsers(): Promise<AssignableUser[]> {
  await ensureReady();
  const users = await db.user.findMany({
    where: { isActive: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  return users.map((user) => ({
    id: user.id,
    name: displayName(user),
    email: user.email,
  }));
}

export async function getManualCalendarItems(
  ctx: UserContext,
  filters: CalendarFilters = {},
  options: { includeCompleted?: boolean } = {},
): Promise<CalendarItem[]> {
  await ensureReady();

  const tasks = await db.task.findMany({
    where: {
      ...taskEntityFilter(ctx),
      status: options.includeCompleted
        ? undefined
        : { in: ["OPEN", "IN_PROGRESS"] },
      ...(filters.entityId ? { entityId: filters.entityId } : {}),
      ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
      ...(filters.start || filters.end
        ? {
            dueDate: {
              ...(filters.start ? { gte: filters.start } : {}),
              ...(filters.end ? { lte: filters.end } : {}),
            },
          }
        : {}),
    },
    include: {
      entity: { select: { name: true } },
      assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { dueDate: "asc" },
    take: 200,
  });

  return tasks.map(mapTaskToCalendarItem);
}

export async function getCalendarItems(
  ctx: UserContext,
  filters: CalendarFilters = {},
): Promise<CalendarItem[]> {
  const [systemItems, manualItems] = await Promise.all([
    loadSystemCalendarItems(ctx, filters),
    getManualCalendarItems(ctx, filters),
  ]);

  return aggregateCalendarItems(systemItems, manualItems, filters);
}

export async function getCalendarItemsForView(
  ctx: UserContext,
  view: CalendarViewMode,
  anchor: Date,
  filters: Omit<CalendarFilters, "start" | "end"> = {},
): Promise<CalendarItem[]> {
  const range = viewDateRange(view, anchor);
  return getCalendarItems(ctx, { ...filters, start: range.start, end: range.end });
}

export function groupItemsByDate(items: CalendarItem[]): Map<string, CalendarItem[]> {
  const grouped = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const key = toDateKey(item.date);
    const bucket = grouped.get(key) ?? [];
    bucket.push(item);
    grouped.set(key, bucket);
  }
  return grouped;
}

export async function getTodayView(
  ctx: UserContext,
  options: { entityId?: string } = {},
): Promise<TodayView> {
  const now = new Date();
  const horizon = addDays(now, 7);
  const filters: CalendarFilters = {
    entityId: options.entityId,
    end: horizon,
  };

  const items = await getCalendarItems(ctx, filters);
  const activeItems = items.filter(
    (item) => item.status !== "COMPLETED" && item.status !== "CANCELLED",
  );

  const overdue = activeItems.filter((item) => item.status === "OVERDUE");
  const dueToday = activeItems.filter((item) => item.status === "DUE_TODAY");
  const upcoming = activeItems.filter((item) => item.status === "UPCOMING");
  const assignedToMe = activeItems.filter(
    (item) => item.source === "MANUAL" && item.assigneeId === ctx.id,
  );

  return {
    overdue,
    dueToday,
    upcoming,
    assignedToMe,
    counts: {
      overdue: overdue.length,
      dueToday: dueToday.length,
      upcoming: upcoming.length,
      assignedToMe: assignedToMe.length,
    },
  };
}

export async function getCalendarCounts(
  ctx: UserContext,
  options: { entityId?: string } = {},
): Promise<CalendarCounts> {
  const now = new Date();
  const weekEnd = addDays(startOfDay(now), 7);
  const horizon = addDays(now, 30);
  const items = await getCalendarItems(ctx, {
    entityId: options.entityId,
    end: horizon,
  });
  const active = items.filter(
    (item) => item.status !== "COMPLETED" && item.status !== "CANCELLED",
  );

  const dueThisWeek = active.filter(
    (item) => item.date >= startOfDay(now) && item.date <= weekEnd,
  ).length;

  const openTasks = active.filter((item) => item.source === "MANUAL").length;

  return {
    overdue: active.filter((item) => item.status === "OVERDUE").length,
    dueToday: active.filter((item) => item.status === "DUE_TODAY").length,
    dueThisWeek,
    openTasks,
    upcoming: active.filter((item) => item.status === "UPCOMING").length,
    total: active.length,
  };
}

export async function listTasks(
  ctx: UserContext,
  options: {
    entityId?: string;
    status?: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "ALL";
    assigneeId?: string;
  } = {},
): Promise<TaskRow[]> {
  await ensureReady();

  const where = {
    ...taskEntityFilter(ctx),
    ...(options.entityId ? { entityId: options.entityId } : {}),
    ...(options.assigneeId ? { assigneeId: options.assigneeId } : {}),
    ...(options.status === "OPEN"
      ? { status: { in: ["OPEN", "IN_PROGRESS"] as ("OPEN" | "IN_PROGRESS")[] } }
      : options.status && options.status !== "ALL"
        ? { status: options.status }
        : {}),
  };

  const tasks = await db.task.findMany({
    where,
    include: {
      entity: { select: { name: true } },
      assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    take: 200,
  });

  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    dueDate: task.dueDate,
    status: task.status,
    priority: task.priority,
    entityId: task.entityId,
    entityName: task.entity?.name ?? null,
    assigneeId: task.assigneeId,
    assigneeName: task.assignee ? displayName(task.assignee) : null,
    createdById: task.createdById,
    createdByName: displayName(task.createdBy),
    completedAt: task.completedAt,
    completionNotes: task.completionNotes,
  }));
}

export async function getTaskById(ctx: UserContext, taskId: string): Promise<TaskRow | null> {
  await ensureReady();

  const task = await db.task.findFirst({
    where: {
      id: taskId,
      ...taskEntityFilter(ctx),
    },
    include: {
      entity: { select: { name: true } },
      assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  if (!task) return null;

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    dueDate: task.dueDate,
    status: task.status,
    priority: task.priority,
    entityId: task.entityId,
    entityName: task.entity?.name ?? null,
    assigneeId: task.assigneeId,
    assigneeName: task.assignee ? displayName(task.assignee) : null,
    createdById: task.createdById,
    createdByName: displayName(task.createdBy),
    completedAt: task.completedAt,
    completionNotes: task.completionNotes,
  };
}

export async function listCalendarEntities(ctx: UserContext) {
  await ensureReady();
  const { listEntities } = await import("@/lib/data/entities");
  const entities = await listEntities();

  if (ctx.entityIds.length === 0) return entities;
  return entities.filter((entity) => ctx.entityIds.includes(entity.id));
}

export type DashboardCalendarReminder = {
  id: string;
  title: string;
  subtitle: string;
  date: Date | null;
  href: string;
  severity: "warning" | "danger";
  kind: string;
};

export async function getDashboardCalendarReminders(
  ctx: UserContext,
): Promise<DashboardCalendarReminder[]> {
  const horizon = addDays(startOfDay(new Date()), 30);
  const items = await getCalendarItems(ctx, { end: horizon });

  return items
    .filter((item) => item.status !== "COMPLETED" && item.status !== "CANCELLED")
    .sort((a, b) => {
      const statusOrder = (status: CalendarItem["status"]) => {
        if (status === "OVERDUE") return 0;
        if (status === "DUE_TODAY") return 1;
        return 2;
      };
      const statusDiff = statusOrder(a.status) - statusOrder(b.status);
      if (statusDiff !== 0) return statusDiff;
      return a.date.getTime() - b.date.getTime();
    })
    .slice(0, 12)
    .map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle ?? item.kind.replace(/_/g, " ").toLowerCase(),
      date: item.date,
      href: item.href ?? "/calendar",
      severity: item.severity === "danger" ? "danger" : "warning",
      kind: item.kind,
    }));
}
