import { PlatformHeader } from "@/components/platform/platform-header";
import { CreateExpenseForm } from "@/components/expenses/create-expense-form";
import { ExpensesTable } from "@/components/expenses/expenses-table";
import { listExpenses } from "@/lib/actions/expenses";
import { listEntities } from "@/lib/data/entities";
import { listExpenseTypes } from "@/lib/data/expense-types";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ExpensesPage() {
  const ctx = await requireModuleAccess("EXPENSES");
  const [expenses, entities, expenseTypes] = await Promise.all([
    listExpenses(),
    listEntities(),
    listExpenseTypes(),
  ]);
  const showCreate = canWrite(ctx, "EXPENSES");

  return (
    <>
      <PlatformHeader title="Expenses" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        {showCreate ? <CreateExpenseForm entities={entities} expenseTypes={expenseTypes} /> : null}

        <Card>
          <CardHeader>
            <CardTitle>Expenses</CardTitle>
            <CardDescription>Track recurring and one-time expenses with invoices and payment records.</CardDescription>
          </CardHeader>
          <CardContent>
            <ExpensesTable expenses={expenses} showCreate={showCreate} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
