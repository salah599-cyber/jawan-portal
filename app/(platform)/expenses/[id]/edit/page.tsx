import { forbidden, notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { EditExpenseForm } from "@/components/expenses/edit-expense-form";
import { getExpense } from "@/lib/actions/expenses";
import { listEntities } from "@/lib/data/entities";
import { listExpenseTypes } from "@/lib/data/expense-types";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireModuleAccess("EXPENSES");
  if (!canWrite(ctx, "EXPENSES")) forbidden();

  const [expense, entities, expenseTypes] = await Promise.all([
    getExpense(id),
    listEntities(),
    listExpenseTypes(),
  ]);
  if (!expense) notFound();

  return (
    <>
      <PlatformHeader title="Edit Expense" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <EditExpenseForm expense={expense} entities={entities} expenseTypes={expenseTypes} />
      </main>
    </>
  );
}
