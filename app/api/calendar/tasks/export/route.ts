import { listTasks } from "@/lib/data/calendar";
import { requireModuleAccess } from "@/lib/permissions/access";
import { formatDate } from "@/lib/format";

function csvEscape(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: Request) {
  const ctx = await requireModuleAccess("CALENDAR");
  const { searchParams } = new URL(request.url);

  const entityId = searchParams.get("entity") ?? undefined;
  const assigneeId = searchParams.get("assignee") ?? undefined;
  const statusParam = searchParams.get("status");
  const status =
    statusParam === "OPEN" || statusParam === "COMPLETED" || statusParam === "ALL"
      ? statusParam
      : "ALL";

  const tasks = await listTasks(ctx, {
    entityId,
    assigneeId,
    status,
  });

  const header = [
    "Title",
    "Description",
    "Due Date",
    "Status",
    "Priority",
    "Entity",
    "Assignee",
    "Created By",
    "Completed At",
    "Completion Notes",
  ];

  const rows = tasks.map((task) =>
    [
      task.title,
      task.description ?? "",
      formatDate(task.dueDate),
      task.status,
      task.priority,
      task.entityName ?? "",
      task.assigneeName ?? "",
      task.createdByName,
      task.completedAt ? formatDate(task.completedAt) : "",
      task.completionNotes ?? "",
    ]
      .map(csvEscape)
      .join(","),
  );

  const csv = [header.join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="calendar-tasks-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
