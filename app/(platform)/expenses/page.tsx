import { PlatformHeader } from "@/components/platform/platform-header";
import { CreateExpenseForm } from "@/components/expenses/create-expense-form";
import { listExpenses } from "@/lib/actions/expenses";
import { listEntities } from "@/lib/data/entities";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { EXPENSE_STATUS_LABELS } from "@/lib/labels";
import { formatMoney, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ExpensesPage() {
  const ctx = await requireModuleAccess("EXPENSES");
  const [expenses, entities] = await Promise.all([listExpenses(), listEntities()]);
  const showCreate = canWrite(ctx, "EXPENSES");

  return (
    <>
      <PlatformHeader title="Expenses" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        {showCreate ? <CreateExpenseForm entities={entities} /> : null}

        <Card>
          <CardHeader>
            <CardTitle>Expenses</CardTitle>
            <CardDescription>Track recurring and one-time expenses.</CardDescription>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Recurring</TableHead>
                    <TableHead>Entity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.title}</TableCell>
                      <TableCell>{expense.category}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {EXPENSE_STATUS_LABELS[expense.status] ?? expense.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(expense.amount, expense.currency)}
                      </TableCell>
                      <TableCell>{formatDate(expense.dueDate)}</TableCell>
                      <TableCell>{expense.isRecurring ? "Yes" : "No"}</TableCell>
                      <TableCell>{expense.entity?.name ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
