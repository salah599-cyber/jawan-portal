import type { TodayView as TodayViewData } from "@/lib/calendar/types";
import { CalendarItemRow } from "@/components/calendar/calendar-item-row";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function Section({
  title,
  description,
  items,
  emptyMessage,
  canEdit,
  currentUserId,
}: {
  title: string;
  description: string;
  items: TodayViewData["overdue"];
  emptyMessage: string;
  canEdit: boolean;
  currentUserId: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          items.map((item) => (
            <CalendarItemRow
              key={item.id}
              item={item}
              canEdit={canEdit}
              currentUserId={currentUserId}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function TodayView({
  view,
  canEdit,
  currentUserId,
}: {
  view: TodayViewData;
  canEdit: boolean;
  currentUserId: string;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Section
        title={`Overdue (${view.counts.overdue})`}
        description="Past-due system deadlines and tasks."
        items={view.overdue}
        emptyMessage="Nothing overdue."
        canEdit={canEdit}
        currentUserId={currentUserId}
      />
      <Section
        title={`Due today (${view.counts.dueToday})`}
        description="Items that need attention today."
        items={view.dueToday}
        emptyMessage="Clear for today."
        canEdit={canEdit}
        currentUserId={currentUserId}
      />
      <Section
        title={`Upcoming (${view.counts.upcoming})`}
        description="Due in the next 7 days."
        items={view.upcoming}
        emptyMessage="No upcoming items this week."
        canEdit={canEdit}
        currentUserId={currentUserId}
      />
      <Section
        title={`Assigned to me (${view.counts.assignedToMe})`}
        description="Open manual tasks assigned to you."
        items={view.assignedToMe}
        emptyMessage="No tasks assigned to you."
        canEdit={canEdit}
        currentUserId={currentUserId}
      />
    </div>
  );
}
