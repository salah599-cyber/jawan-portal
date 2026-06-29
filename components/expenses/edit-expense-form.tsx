"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateExpense, type CreateExpenseInput } from "@/lib/actions/expenses";
import { EXPENSE_STATUS_LABELS } from "@/lib/labels";
import { formatDateInput, formatDecimalInput } from "@/lib/format";
import { ExpenseTypeSelect, type ExpenseTypeOption } from "@/components/expenses/expense-type-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EntityOption = { id: string; name: string };

type ExpenseRecord = {
  id: string;
  title: string;
  amount: { toString(): string };
  currency: string;
  expenseTypeId: string | null;
  status: string;
  dueDate: Date | null;
  isRecurring: boolean;
  entityId: string | null;
};

export function EditExpenseForm({
  expense,
  entities,
  expenseTypes,
}: {
  expense: ExpenseRecord;
  entities: EntityOption[];
  expenseTypes: ExpenseTypeOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [types, setTypes] = useState(expenseTypes);
  const [expenseTypeId, setExpenseTypeId] = useState(expense.expenseTypeId ?? expenseTypes[0]?.id ?? "");
  const [status, setStatus] = useState(expense.status);
  const [currency, setCurrency] = useState(expense.currency);
  const [entityId, setEntityId] = useState(expense.entityId ?? "none");
  const [isRecurring, setIsRecurring] = useState(expense.isRecurring);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);

    const input: CreateExpenseInput = {
      title: String(form.get("title") ?? ""),
      amount: String(form.get("amount") ?? ""),
      currency,
      expenseTypeId,
      status: status as CreateExpenseInput["status"],
      dueDate: String(form.get("dueDate") ?? ""),
      isRecurring,
      entityId: entityId === "none" ? undefined : entityId,
    };

    startTransition(async () => {
      try {
        await updateExpense(expense.id, input);
        router.push("/expenses/" + expense.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update expense.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Expense</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required defaultValue={expense.title} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={formatDecimalInput(expense.amount)}
            />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["OMR", "USD", "EUR", "GBP", "AED"].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Expense Type</Label>
            <ExpenseTypeSelect
              types={types}
              value={expenseTypeId}
              onValueChange={setExpenseTypeId}
              onTypeAdded={(type) => setTypes((current) => [...current, type])}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EXPENSE_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              name="dueDate"
              type="date"
              defaultValue={formatDateInput(expense.dueDate)}
            />
          </div>
          <div className="space-y-2">
            <Label>Entity (optional)</Label>
            <Select value={entityId} onValueChange={setEntityId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {entities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <input
              id="isRecurring"
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="size-4 rounded border"
            />
            <Label htmlFor="isRecurring">Recurring expense</Label>
          </div>
          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={pending || !expenseTypeId}>
              {pending ? "Saving..." : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
