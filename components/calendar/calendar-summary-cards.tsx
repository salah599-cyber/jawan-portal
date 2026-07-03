import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CalendarCounts } from "@/lib/calendar/types";

export function CalendarSummaryCards({ counts }: { counts: CalendarCounts }) {
  const cards = [
    { label: "Overdue", value: counts.overdue, tone: "text-destructive" },
    { label: "Due today", value: counts.dueToday, tone: "text-amber-600 dark:text-amber-400" },
    { label: "This week", value: counts.dueThisWeek, tone: "text-foreground" },
    { label: "Open tasks", value: counts.openTasks, tone: "text-foreground" },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn("text-2xl font-semibold tabular-nums", card.tone)}>
              {card.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
