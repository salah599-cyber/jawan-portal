import Link from "next/link";
import { PlatformHeader } from "@/components/platform/platform-header";
import { CalendarTasksFilters } from "@/components/calendar/calendar-tasks-filters";
import { CreateTaskDialog } from "@/components/calendar/create-task-dialog";
import { TasksTable } from "@/components/calendar/tasks-table";
import {
  listAssignableUsers,
  listCalendarEntities,
  listTasks,
} from "@/lib/data/calendar";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CalendarTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; status?: string; assignee?: string }>;
}) {
  const { entity: entityParam, status: statusParam, assignee: assigneeParam } = await searchParams;
  const ctx = await requireModuleAccess("CALENDAR");
  const entities = await listCalendarEntities(ctx);
  const entityId =
    entityParam && entities.some((entity) => entity.id === entityParam)
      ? entityParam
      : undefined;

  const status =
    statusParam === "OPEN" || statusParam === "COMPLETED" || statusParam === "ALL"
      ? statusParam
      : "OPEN";

  const [assignees, tasks] = await Promise.all([
    listAssignableUsers(),
    listTasks(ctx, {
      entityId,
      status,
      assigneeId: assigneeParam || undefined,
    }),
  ]);

  const canEdit = canWrite(ctx, "CALENDAR");

  const exportHref = `/api/calendar/tasks/export?${new URLSearchParams({
    ...(entityId ? { entity: entityId } : {}),
    ...(status !== "ALL" ? { status } : {}),
    ...(assigneeParam ? { assignee: assigneeParam } : {}),
  }).toString()}`;

  return (
    <>
      <PlatformHeader title="Tasks" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Manual tasks</h2>
            <p className="text-sm text-muted-foreground">
              Create, assign, and complete tasks tracked on the calendar.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/calendar">Back to calendar</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={exportHref}>Export CSV</a>
            </Button>
            {canEdit ? <CreateTaskDialog entities={entities} assignees={assignees} /> : null}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Narrow the task list by status, entity, or assignee.</CardDescription>
          </CardHeader>
          <CardContent>
            <CalendarTasksFilters
              entityId={entityId}
              entities={entities}
              status={status}
              assigneeId={assigneeParam}
              assignees={assignees}
              currentUserId={ctx.id}
              currentParams={{
                entity: entityParam,
                status: statusParam ?? (status === "OPEN" ? undefined : status),
                assignee: assigneeParam,
              }}
            />
          </CardContent>
        </Card>

        <TasksTable tasks={tasks} canEdit={canEdit} currentUserId={ctx.id} />
      </main>
    </>
  );
}
