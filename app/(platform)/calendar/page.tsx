import Link from "next/link";
import { PlatformHeader } from "@/components/platform/platform-header";
import { CreateTaskDialog } from "@/components/calendar/create-task-dialog";
import { TodayView } from "@/components/calendar/today-view";
import {
  getTodayView,
  listAssignableUsers,
  listCalendarEntities,
} from "@/lib/data/calendar";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string }>;
}) {
  const { entity: entityParam } = await searchParams;
  const ctx = await requireModuleAccess("CALENDAR");
  const entities = await listCalendarEntities(ctx);
  const entityId =
    entityParam && entities.some((entity) => entity.id === entityParam)
      ? entityParam
      : undefined;

  const [assignees, view] = await Promise.all([
    listAssignableUsers(),
    getTodayView(ctx, { entityId }),
  ]);

  const canEdit = canWrite(ctx, "CALENDAR");
  const totalActive =
    view.counts.overdue + view.counts.dueToday + view.counts.upcoming;

  return (
    <>
      <PlatformHeader title="Calendar & Tasks" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Today</h2>
            <p className="text-sm text-muted-foreground">
              System deadlines from cheques, expenses, loans, and documents — plus manual tasks.
            </p>
          </div>
          {canEdit ? <CreateTaskDialog entities={entities} assignees={assignees} /> : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-destructive">{view.counts.overdue}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Due today</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{view.counts.dueToday}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{view.counts.upcoming}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Assigned to me</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{view.counts.assignedToMe}</p>
            </CardContent>
          </Card>
        </div>

        {entities.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            <Button variant={!entityParam ? "default" : "outline"} size="sm" asChild>
              <Link href="/calendar">All entities</Link>
            </Button>
            {entities.map((entity) => (
              <Button
                key={entity.id}
                variant={entityId === entity.id && entityParam ? "default" : "outline"}
                size="sm"
                asChild
              >
                <Link href={`/calendar?entity=${entity.id}`}>{entity.name}</Link>
              </Button>
            ))}
          </div>
        ) : null}

        {totalActive === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No upcoming deadlines or open tasks.{" "}
              {canEdit ? "Create a task to track something manually." : ""}
            </CardContent>
          </Card>
        ) : (
          <TodayView view={view} canEdit={canEdit} currentUserId={ctx.id} />
        )}
      </main>
    </>
  );
}
