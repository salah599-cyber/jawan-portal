import Link from "next/link";
import type { CalendarItem } from "@/lib/calendar/types";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { CompleteTaskButton } from "@/components/calendar/complete-task-button";

const KIND_LABELS: Record<string, string> = {
  CHEQUE_DUE: "Cheque",
  EXPENSE_DUE: "Expense",
  LOAN_MATURITY: "Loan",
  DOCUMENT_EXPIRY: "Document",
  TASK: "Task",
};

function severityClass(severity: CalendarItem["severity"]) {
  if (severity === "danger") return "border-destructive/40 bg-destructive/5";
  if (severity === "warning") return "border-amber-500/40 bg-amber-500/5";
  return "border-border";
}

export function CalendarItemRow({
  item,
  canEdit,
  currentUserId,
}: {
  item: CalendarItem;
  canEdit: boolean;
  currentUserId: string;
}) {
  const canCompleteTask =
    item.source === "MANUAL" &&
    item.taskId &&
    item.status !== "COMPLETED" &&
    item.status !== "CANCELLED" &&
    (canEdit || item.assigneeId === currentUserId);

  const content = (
    <div
      className={`flex items-start justify-between gap-3 rounded-lg border p-3 ${severityClass(item.severity)}`}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{KIND_LABELS[item.kind] ?? item.kind}</Badge>
          {item.source === "MANUAL" && item.priority ? (
            <Badge variant="secondary">{item.priority}</Badge>
          ) : null}
          {item.entityName ? (
            <span className="text-xs text-muted-foreground">{item.entityName}</span>
          ) : null}
        </div>
        <p className="font-medium">{item.title}</p>
        {item.subtitle ? <p className="text-sm text-muted-foreground">{item.subtitle}</p> : null}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>{formatDate(item.date)}</span>
          {item.assigneeName ? <span>Assigned to {item.assigneeName}</span> : null}
        </div>
      </div>
      {canCompleteTask && item.taskId ? (
        <CompleteTaskButton taskId={item.taskId} title={item.title} />
      ) : null}
    </div>
  );

  if (item.href && item.source === "SYSTEM") {
    return (
      <Link href={item.href} className="block transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
