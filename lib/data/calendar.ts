import { db } from "@/lib/db";
import { ensureCalendarSchema } from "@/lib/db/ensure-calendar-schema";
import { aggregateCalendarItems, loadSystemCalendarItems } from "@/lib/calendar/aggregate";
import { addDays, resolveItemStatus, resolveSeverity } from "@/lib/calendar/status";
import type {
  AssignableUser,
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
): Promise<CalendarItem[]> {
  await ensureReady();

  const tasks = await db.task.findMany({
    where: {
      ...taskEntityFilter(ctx),
      status: { in: ["OPEN", "IN_PROGRESS"] },
      ...(filters.entityId ? { entityId: filters.entityId } : {}),
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
    take: 100,
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
