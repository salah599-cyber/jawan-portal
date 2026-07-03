import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CalendarView } from "@/lib/calendar/date-ranges";

const VIEWS: { id: CalendarView; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "list", label: "List" },
];

export function CalendarViewTabs({
  active,
  date,
  entityId,
}: {
  active: CalendarView;
  date: string;
  entityId?: string;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-1">
      {VIEWS.map((view) => {
        const params = new URLSearchParams({ view: view.id, date });
        if (entityId) params.set("entity", entityId);
        return (
        <Link
          key={view.id}
          href={`/calendar?${params.toString()}`}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            active === view.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {view.label}
        </Link>
        );
      })}
    </div>
  );
}
