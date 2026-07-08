import Link from "next/link";
import type { TaskRow } from "@/lib/calendar/types";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { CompleteTaskButton } from "@/components/calendar/complete-task-button";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function statusVariant(status: string) {
  if (status === "COMPLETED") return "secondary";
  if (status === "CANCELLED") return "outline";
  if (status === "IN_PROGRESS") return "default";
  return "secondary";
}

export function TasksTable({
  tasks,
  canEdit,
  currentUserId,
}: {
  tasks: TaskRow[];
  canEdit: boolean;
  currentUserId: string;
}) {
  if (tasks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No tasks match your filters. Create a task from the calendar page.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Due</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Entity</TableHead>
          <TableHead>Assignee</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => {
          const canComplete =
            task.status !== "COMPLETED" &&
            task.status !== "CANCELLED" &&
            (canEdit || task.assigneeId === currentUserId);

          return (
            <TableRow key={task.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{task.title}</p>
                  {task.description ? (
                    <p className="text-xs text-muted-foreground">{task.description}</p>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>{formatDate(task.dueDate)}</TableCell>
              <TableCell>
                <Badge variant={statusVariant(task.status)}>{task.status.replace("_", " ")}</Badge>
              </TableCell>
              <TableCell>{task.priority}</TableCell>
              <TableCell>{task.entityName ?? "—"}</TableCell>
              <TableCell>{task.assigneeName ?? "Unassigned"}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {canComplete ? (
                    <CompleteTaskButton taskId={task.id} title={task.title} />
                  ) : null}
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/calendar">View</Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
