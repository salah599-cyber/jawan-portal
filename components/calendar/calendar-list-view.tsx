import { CalendarItemRow } from "@/components/calendar/calendar-item-row";
import type { CalendarItem } from "@/lib/calendar/types";
import { formatDateUtc } from "@/lib/format";

export function CalendarListView({
  items,
  canEdit,
  currentUserId,
}: {
  items: CalendarItem[];
  canEdit?: boolean;
  currentUserId?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No calendar items in this range. Create a task or check other modules for upcoming dates.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {items.map((item, index) => {
        const dateKey = item.date.toISOString().slice(0, 10);
        const prevDateKey = index > 0 ? items[index - 1].date.toISOString().slice(0, 10) : null;
        const showDate = dateKey !== prevDateKey;

        return (
          <li key={item.id}>
            {showDate && (
              <div className="border-b border-border bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">
                {formatDateUtc(item.date)}
              </div>
            )}
            <CalendarItemRow
              item={item}
              canEdit={canEdit}
              currentUserId={currentUserId}
            />
          </li>
        );
      })}
    </ul>
  );
}
