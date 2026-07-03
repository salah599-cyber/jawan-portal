import Link from "next/link";
import { cn } from "@/lib/utils";
import { buildMonthGrid, formatMonthLabel } from "@/lib/calendar/date-ranges";
import type { CalendarItem } from "@/lib/calendar/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarMonthGrid({
  anchorDate,
  itemsByDate,
}: {
  anchorDate: Date;
  itemsByDate: Record<string, CalendarItem[]>;
}) {
  const cells = buildMonthGrid(anchorDate);
  const monthLabel = formatMonthLabel(anchorDate);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{monthLabel}</h2>
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-7 border-b border-border bg-muted/40">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell) => {
            const key = cell.date.toISOString().slice(0, 10);
            const items = itemsByDate[key] ?? [];
            const overdue = items.some((i) => i.status === "OVERDUE");
            const dueToday = items.some((i) => i.status === "DUE_TODAY");

            return (
              <div
                key={key}
                className={cn(
                  "min-h-[88px] border-b border-r border-border p-1.5",
                  !cell.inMonth && "bg-muted/20 text-muted-foreground",
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      "text-xs font-medium",
                      cell.isToday && "rounded-full bg-primary px-1.5 text-primary-foreground",
                    )}
                  >
                    {cell.date.getUTCDate()}
                  </span>
                  {items.length > 0 && (
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        overdue
                          ? "bg-destructive"
                          : dueToday
                            ? "bg-amber-500"
                            : "bg-primary",
                      )}
                    />
                  )}
                </div>
                <ul className="mt-1 space-y-0.5">
                  {items.slice(0, 2).map((item) => (
                    <li key={item.id}>
                      {item.href ? (
                        <Link
                          href={item.href}
                          className="block truncate text-[10px] leading-tight text-foreground hover:underline"
                          title={item.title}
                        >
                          {item.title}
                        </Link>
                      ) : (
                        <span
                          className="block truncate text-[10px] leading-tight text-foreground"
                          title={item.title}
                        >
                          {item.title}
                        </span>
                      )}
                    </li>
                  ))}
                  {items.length > 2 && (
                    <li className="text-[10px] text-muted-foreground">
                      +{items.length - 2} more
                    </li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
