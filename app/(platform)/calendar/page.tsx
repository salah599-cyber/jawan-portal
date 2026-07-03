import Link from "next/link";
import { PlatformHeader } from "@/components/platform/platform-header";
import { CalendarListView } from "@/components/calendar/calendar-list-view";
import { CalendarMonthGrid } from "@/components/calendar/calendar-month-grid";
import { CalendarSummaryCards } from "@/components/calendar/calendar-summary-cards";
import { CalendarViewTabs } from "@/components/calendar/calendar-view-tabs";
import { CalendarWeekView } from "@/components/calendar/calendar-week-view";
import { CreateTaskDialog } from "@/components/calendar/create-task-dialog";
import { TodayView } from "@/components/calendar/today-view";
import {
  getCalendarCounts,
  getCalendarItemsForView,
  getTodayView,
  groupItemsByDate,
  listAssignableUsers,
  listCalendarEntities,
} from "@/lib/data/calendar";
import {
  parseAnchorDate,
  parseCalendarView,
  toDateKey,
  weekDateKeys,
} from "@/lib/calendar/date-ranges";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Button } from "@/components/ui/button";

function calendarHref({
  view,
  date,
  entityId,
}: {
  view: string;
  date: string;
  entityId?: string;
}) {
  const params = new URLSearchParams({ view, date });
  if (entityId) params.set("entity", entityId);
  return `/calendar?${params.toString()}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; view?: string; date?: string }>;
}) {
  const { entity: entityParam, view: viewParam, date: dateParam } = await searchParams;
  const ctx = await requireModuleAccess("CALENDAR");
  const entities = await listCalendarEntities(ctx);
  const entityId =
    entityParam && entities.some((entity) => entity.id === entityParam)
      ? entityParam
      : undefined;

  const view = parseCalendarView(viewParam);
  const anchorDate = parseAnchorDate(dateParam);
  const dateKey = toDateKey(anchorDate);

  const [assignees, counts, todayView, viewItems] = await Promise.all([
    listAssignableUsers(),
    getCalendarCounts(ctx, { entityId }),
    view === "today" ? getTodayView(ctx, { entityId }) : Promise.resolve(null),
    view !== "today"
      ? getCalendarItemsForView(ctx, view, anchorDate, { entityId })
      : Promise.resolve([]),
  ]);

  const canEdit = canWrite(ctx, "CALENDAR");
  const grouped = groupItemsByDate(viewItems);
  const itemsByDate = Object.fromEntries(grouped.entries());
  const activeViewItems = viewItems.filter(
    (item) => item.status !== "COMPLETED" && item.status !== "CANCELLED",
  );

  return (
    <>
      <PlatformHeader title="Calendar & Tasks" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Calendar & Tasks</h2>
            <p className="text-sm text-muted-foreground">
              System deadlines across modules plus manual tasks in one unified view.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/calendar/tasks">Manage tasks</Link>
            </Button>
            {canEdit ? <CreateTaskDialog entities={entities} assignees={assignees} /> : null}
          </div>
        </div>

        <CalendarViewTabs active={view} date={dateKey} entityId={entityId} />

        <CalendarSummaryCards counts={counts} />

        {entities.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            <Button variant={!entityId ? "default" : "outline"} size="sm" asChild>
              <Link href={calendarHref({ view, date: dateKey })}>All entities</Link>
            </Button>
            {entities.map((entity) => (
              <Button
                key={entity.id}
                variant={entityId === entity.id ? "default" : "outline"}
                size="sm"
                asChild
              >
                <Link href={calendarHref({ view, date: dateKey, entityId: entity.id })}>
                  {entity.name}
                </Link>
              </Button>
            ))}
          </div>
        ) : null}

        {view === "today" && todayView ? (
          <TodayView view={todayView} canEdit={canEdit} currentUserId={ctx.id} />
        ) : null}

        {view === "week" ? (
          <CalendarWeekView
            anchorDate={anchorDate}
            itemsByDate={itemsByDate}
            orderedDates={weekDateKeys(anchorDate)}
            canEdit={canEdit}
            currentUserId={ctx.id}
          />
        ) : null}

        {view === "month" ? (
          <CalendarMonthGrid anchorDate={anchorDate} itemsByDate={itemsByDate} />
        ) : null}

        {view === "list" ? (
          <CalendarListView
            items={activeViewItems}
            canEdit={canEdit}
            currentUserId={ctx.id}
          />
        ) : null}
      </main>
    </>
  );
}
