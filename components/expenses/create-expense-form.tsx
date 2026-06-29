"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createExpense } from "@/lib/actions/expenses";
import { EXPENSE_STATUS_LABELS } from "@/lib/labels";
import { ExpenseTypeSelect, type ExpenseTypeOption } from "@/components/expenses/expense-type-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EntityOption = { id: string; name: string };

function FileSection({
  id,
  name,
  label,
  description,
}: {
  id: string;
  name: string;
  label: string;
  description: string;
}) {
  return (
    <div className="space-y-2 md:col-span-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" />
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function CreateExpenseForm({
  entities,
  expenseTypes,
}: {
  entities: EntityOption[];
  expenseTypes: ExpenseTypeOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [types, setTypes] = useState(expenseTypes);
  const [expenseTypeId, setExpenseTypeId] = useState(expenseTypes[0]?.id ?? "");
  const [status, setStatus] = useState("PENDING");
  const [currency, setCurrency] = useState("OMR");
  const [entityId, setEntityId] = useState<string>("none");
  const [isRecurring, setIsRecurring] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("expenseTypeId", expenseTypeId);
    formData.set("status", status);
    formData.set("currency", currency);
    formData.set("isRecurring", isRecurring ? "true" : "false");
    if (entityId !== "none") formData.set("entityId", entityId);

    startTransition(async () => {
      try {
        const expense = await createExpense(formData);
        router.push("/expenses/" + expense.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create expense.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Expense</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" name="amount" type="number" step="0.01" min="0" required />
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
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
                <SelectValue placeholder="Select status" />
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
            <Input id="dueDate" name="dueDate" type="date" />
          </div>

          <div className="space-y-2">
            <Label>Entity (optional)</Label>
            <Select value={entityId} onValueChange={setEntityId}>
              <SelectTrigger>
                <SelectValue placeholder="Select entity" />
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

          <div className="md:col-span-2">
            <p className="mb-3 text-sm font-medium">Supporting Documents (optional)</p>
          </div>
          <FileSection
            id="invoiceFiles"
            name="invoiceFiles"
            label="Invoice"
            description="Upload invoice copies. Multiple files allowed."
          />
          <FileSection
            id="paymentSlipFiles"
            name="paymentSlipFiles"
            label="Payment Slip"
            description="Upload payment confirmation slips."
          />
          <FileSection
            id="chequeFiles"
            name="chequeFiles"
            label="Cheque Copy"
            description="Upload cheque copies used for payment."
          />

          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}

          <div className="md:col-span-2">
            <Button type="submit" disabled={pending || !expenseTypeId}>
              {pending ? "Creating..." : "Create Expense"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
