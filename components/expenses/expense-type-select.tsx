"use client";

import { useState, useTransition } from "react";
import { addExpenseType } from "@/lib/actions/expenses";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

export type ExpenseTypeOption = { id: string; name: string };

export function ExpenseTypeSelect({
  types,
  value,
  onValueChange,
  onTypeAdded,
}: {
  types: ExpenseTypeOption[];
  value: string;
  onValueChange: (value: string) => void;
  onTypeAdded?: (type: ExpenseTypeOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAddType() {
    setError(null);
    startTransition(async () => {
      try {
        const type = await addExpenseType(newTypeName);
        onTypeAdded?.(type);
        onValueChange(type.id);
        setNewTypeName("");
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add expense type.");
      }
    });
  }

  return (
    <div className="flex gap-2">
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Select expense type" />
        </SelectTrigger>
        <SelectContent>
          {types.map((type) => (
            <SelectItem key={type.id} value={type.id}>
              {type.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="icon" aria-label="Add expense type">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense Type</DialogTitle>
            <DialogDescription>Create a new type for categorizing expenses.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="newExpenseType">Type name</Label>
            <Input
              id="newExpenseType"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              placeholder="e.g. Maintenance"
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleAddType} disabled={pending || !newTypeName.trim()}>
              {pending ? "Adding..." : "Add Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
