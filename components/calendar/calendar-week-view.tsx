import { formatWeekRangeLabel } from "@/lib/calendar/date-ranges";
import { CalendarItemRow } from "@/components/calendar/calendar-item-row";
import type { CalendarItem } from "@/lib/calendar/types";

export function CalendarWeekView({
  anchorDate,
  itemsByDate,
  orderedDates,
  canEdit,
  currentUserId,
}: {
  anchorDate: Date;
  itemsByDate: Record<string, CalendarItem[]>;
  orderedDates: string[];
  canEdit?: boolean;
  currentUserId?: string;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{formatWeekRangeLabel(anchorDate)}</h2>
      <div className="space-y-6">
        {orderedDates.map((dateKey) => {
          const items = itemsByDate[dateKey] ?? [];
          const label = new Date(`${dateKey}T12:00:00.000Z`).toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "short",
            timeZone: "UTC",
          });

          return (
            <section key={dateKey}>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">{label}</h3>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing scheduled</p>
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {items.map((item) => (
                    <CalendarItemRow
                      key={item.id}
                      item={item}
                      canEdit={canEdit}
                      currentUserId={currentUserId}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
