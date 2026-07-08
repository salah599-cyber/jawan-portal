"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTask } from "@/lib/actions/calendar";
import type { AssignableUser } from "@/lib/calendar/types";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

export function CreateTaskDialog({
  entities,
  assignees,
}: {
  entities: EntityOption[];
  assignees: AssignableUser[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [entityId, setEntityId] = useState("");
  const [assigneeId, setAssigneeId] = useState("none");
  const [priority, setPriority] = useState("MEDIUM");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    form.set("entityId", entityId);
    form.set("assigneeId", assigneeId === "none" ? "" : assigneeId);
    form.set("priority", priority);

    startTransition(async () => {
      try {
        await createTask(form);
        setOpen(false);
        e.currentTarget.reset();
        setAssigneeId("none");
        setPriority("MEDIUM");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create task.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>
            Add a manual reminder or action item for yourself or a team member.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" name="title" required placeholder="What needs to be done?" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea id="task-description" name="description" rows={3} placeholder="Optional details" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="task-due-date">Due date</Label>
              <Input id="task-due-date" name="dueDate" type="date" required />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Entity</Label>
              <EntitySelect
                entities={entities}
                value={entityId}
                onValueChange={setEntityId}
                allowAdd={false}
                allowNone
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label>Assign to</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {assignees.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
