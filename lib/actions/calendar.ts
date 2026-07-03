"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit/log";
import { ensureCalendarSchema } from "@/lib/db/ensure-calendar-schema";
import type { TaskPriority, TaskStatus } from "@/lib/generated/prisma/client";
import { getTaskById } from "@/lib/data/calendar";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { taskEntityFilter } from "@/lib/permissions/scoped-queries";

const CALENDAR_PATHS = ["/calendar", "/calendar/tasks"];

function parseTaskStatus(value: string): TaskStatus {
  const status = value.trim().toUpperCase() as TaskStatus;
  if (!["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(status)) {
    throw new Error("Invalid task status.");
  }
  return status;
}

function parseTaskPriority(value: string): TaskPriority {
  const priority = value.trim().toUpperCase() as TaskPriority;
  if (!["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority)) {
    throw new Error("Invalid task priority.");
  }
  return priority;
}

async function assertTaskAccess(ctx: Awaited<ReturnType<typeof requireModuleAccess>>, taskId: string) {
  await ensureCalendarSchema();
  const task = await db.task.findFirst({
    where: { id: taskId, ...taskEntityFilter(ctx) },
    select: { id: true },
  });
  if (!task) throw new Error("Task not found.");
}

export async function createTask(formData: FormData) {
  const ctx = await requireModuleAccess("CALENDAR");
  if (!canWrite(ctx, "CALENDAR")) {
    throw new Error("You do not have permission to create tasks.");
  }

  await ensureCalendarSchema();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || undefined;
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const priority = parseTaskPriority(String(formData.get("priority") ?? "MEDIUM"));
  const entityIdRaw = String(formData.get("entityId") ?? "").trim();
  const assigneeIdRaw = String(formData.get("assigneeId") ?? "").trim();

  if (!title) throw new Error("Title is required.");
  if (!dueDateRaw) throw new Error("Due date is required.");

  const dueDate = new Date(dueDateRaw);
  if (Number.isNaN(dueDate.getTime())) throw new Error("Invalid due date.");

  if (entityIdRaw && ctx.entityIds.length > 0 && !ctx.entityIds.includes(entityIdRaw)) {
    throw new Error("You do not have access to this entity.");
  }

  const task = await db.task.create({
    data: {
      title,
      description,
      dueDate,
      priority,
      entityId: entityIdRaw || null,
      assigneeId: assigneeIdRaw || null,
      createdById: ctx.id,
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "calendar_task",
    resourceId: task.id,
    metadata: { title, assigneeId: task.assigneeId, entityId: task.entityId },
  });

  revalidatePath(CALENDAR_PATHS[0]);
  revalidatePath(CALENDAR_PATHS[1]);
  return task.id;
}

export async function updateTask(taskId: string, formData: FormData) {
  const ctx = await requireModuleAccess("CALENDAR");
  if (!canWrite(ctx, "CALENDAR")) {
    throw new Error("You do not have permission to edit tasks.");
  }

  await assertTaskAccess(ctx, taskId);

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const priority = parseTaskPriority(String(formData.get("priority") ?? "MEDIUM"));
  const status = parseTaskStatus(String(formData.get("status") ?? "OPEN"));
  const entityIdRaw = String(formData.get("entityId") ?? "").trim();
  const assigneeIdRaw = String(formData.get("assigneeId") ?? "").trim();

  if (!title) throw new Error("Title is required.");
  if (!dueDateRaw) throw new Error("Due date is required.");

  const dueDate = new Date(dueDateRaw);
  if (Number.isNaN(dueDate.getTime())) throw new Error("Invalid due date.");

  await db.task.update({
    where: { id: taskId },
    data: {
      title,
      description,
      dueDate,
      priority,
      status,
      entityId: entityIdRaw || null,
      assigneeId: assigneeIdRaw || null,
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "calendar_task",
    resourceId: taskId,
    metadata: { title, status, assigneeId: assigneeIdRaw || null },
  });

  revalidatePath(CALENDAR_PATHS[0]);
  revalidatePath(CALENDAR_PATHS[1]);
}

export async function completeTask(taskId: string, formData: FormData) {
  const ctx = await requireModuleAccess("CALENDAR");

  await assertTaskAccess(ctx, taskId);

  const existing = await getTaskById(ctx, taskId);
  if (!existing) throw new Error("Task not found.");

  const isAssignee = existing.assigneeId === ctx.id;
  if (!canWrite(ctx, "CALENDAR") && !isAssignee) {
    throw new Error("You do not have permission to complete this task.");
  }

  const completionNotes = String(formData.get("completionNotes") ?? "").trim() || null;

  await db.task.update({
    where: { id: taskId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      completedById: ctx.id,
      completionNotes,
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "COMPLETE",
    resource: "calendar_task",
    resourceId: taskId,
    metadata: { completionNotes },
  });

  revalidatePath(CALENDAR_PATHS[0]);
  revalidatePath(CALENDAR_PATHS[1]);
}

export async function reopenTask(taskId: string) {
  const ctx = await requireModuleAccess("CALENDAR");
  if (!canWrite(ctx, "CALENDAR")) {
    throw new Error("You do not have permission to reopen tasks.");
  }

  await assertTaskAccess(ctx, taskId);

  await db.task.update({
    where: { id: taskId },
    data: {
      status: "OPEN",
      completedAt: null,
      completedById: null,
      completionNotes: null,
    },
  });

  revalidatePath(CALENDAR_PATHS[0]);
  revalidatePath(CALENDAR_PATHS[1]);
}
