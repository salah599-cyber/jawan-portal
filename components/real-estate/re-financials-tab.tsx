"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPropertyExpense } from "@/lib/actions/real-estate";
import { RE_PROPERTY_EXPENSE_CATEGORY_LABELS } from "@/lib/labels";
import { formatDate, formatOmr } from "@/lib/format";
import type { SerializedReProperty } from "@/lib/real-estate/serialize";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const EXPENSE_PAYMENT_LABELS: Record<string, string> = {
  PAID: "Paid",
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partially Paid",
};

function ExpenseForm({
  property,
  onDone,
}: {
  property: SerializedReProperty;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("OTHER");
  const [unitId, setUnitId] = useState("none");
  const [paymentStatus, setPaymentStatus] = useState("UNPAID");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("category", category);
    formData.set("unitId", unitId === "none" ? "" : unitId);
    formData.set("paymentStatus", paymentStatus);

    startTransition(async () => {
      try {
        await createPropertyExpense(property.id, formData);
        onDone();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add expense.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="expenseDate">Expense Date</Label>
        <Input id="expenseDate" name="expenseDate" type="date" required />
      </div>
      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(RE_PROPERTY_EXPENSE_CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="amountOmr">Amount (OMR)</Label>
        <Input id="amountOmr" name="amountOmr" required />
      </div>
      <div className="space-y-2">
        <Label>Unit (optional)</Label>
        <Select value={unitId} onValueChange={setUnitId}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Property-wide</SelectItem>
            {property.units.map((unit) => (
              <SelectItem key={unit.id} value={unit.id}>Unit {unit.unitNumber}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="vendorName">Vendor</Label>
        <Input id="vendorName" name="vendorName" />
      </div>
      <div className="space-y-2">
        <Label>Payment Status</Label>
        <Select value={paymentStatus} onValueChange={setPaymentStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(EXPENSE_PAYMENT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>
      {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
      <div className="flex gap-2 md:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Add Expense"}</Button>
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

export function ReFinancialsTab({
  property,
  canEdit,
}: {
  property: SerializedReProperty;
  canEdit: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const { metrics } = property;

  const incomeSummary = useMemo(() => {
    const annualRent = metrics.grossAnnualRentOmr;
    const collectedYtd = metrics.rentCollectedYtdOmr;
    return [
      { label: "Gross Annual Rent", amount: annualRent },
      { label: "Rent Collected (YTD)", amount: collectedYtd },
      { label: "Outstanding / Overdue", amount: metrics.overdueRentOmr },
    ];
  }, [metrics]);

  const expenseSummary = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const expense of property.expenses) {
      const amount = parseFloat(expense.amountOmr ?? "0");
      const current = byCategory.get(expense.category) ?? 0;
      byCategory.set(expense.category, current + amount);
    }
    return [...byCategory.entries()]
      .map(([category, amount]) => ({
        category,
        label: RE_PROPERTY_EXPENSE_CATEGORY_LABELS[category] ?? category,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [property.expenses]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Operating Income</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatOmr(metrics.netOperatingIncomeOmr)}</p>
            <p className="text-xs text-muted-foreground">YTD estimate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gross Yield</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {metrics.grossYieldPct != null ? `${metrics.grossYieldPct.toFixed(1)}%` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Yield</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {metrics.netYieldPct != null ? `${metrics.netYieldPct.toFixed(1)}%` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatOmr(metrics.totalExpensesYtdOmr)}</p>
            <p className="text-xs text-muted-foreground">Excludes maintenance</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Maintenance (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatOmr(metrics.totalMaintenanceCostYtdOmr)}</p>
            <p className="text-xs text-muted-foreground">Includes completed maintenance costs</p>
          </CardContent>
        </Card>
      </div>

      {canEdit && !showForm ? (
        <Button onClick={() => setShowForm(true)}>Add Expense</Button>
      ) : null}

      {canEdit && showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Add Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseForm property={property} onDone={() => setShowForm(false)} />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Income Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeSummary.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell>{row.label}</TableCell>
                    <TableCell className="text-right">{formatOmr(row.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
            <CardDescription>{property.expenses.length} expense record(s)</CardDescription>
          </CardHeader>
          <CardContent>
            {expenseSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses recorded.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseSummary.map((row) => (
                    <TableRow key={row.category}>
                      <TableCell>{row.label}</TableCell>
                      <TableCell className="text-right">{formatOmr(row.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {property.expenses.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Expense Ledger</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {property.expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{formatDate(expense.expenseDate)}</TableCell>
                    <TableCell>
                      {RE_PROPERTY_EXPENSE_CATEGORY_LABELS[expense.category] ?? expense.category}
                    </TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>{expense.unit?.unitNumber ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatOmr(expense.amountOmr)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
