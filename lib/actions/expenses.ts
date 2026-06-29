"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit/log";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { expenseEntityFilter } from "@/lib/permissions/scoped-queries";
import type { ExpenseStatus } from "@/lib/generated/prisma/client";

export type CreateExpenseInput = {
  title: string;
  amount: string;
  currency: string;
  category: string;
  status: ExpenseStatus;
  dueDate?: string;
  isRecurring: boolean;
  entityId?: string;
};

export async function createExpense(input: CreateExpenseInput) {
  const ctx = await requireModuleAccess("EXPENSES");
  if (!canWrite(ctx, "EXPENSES")) {
    throw new Error("You do not have permission to create expenses.");
  }

  if (
    input.entityId &&
    ctx.entityIds.length > 0 &&
    !ctx.entityIds.includes(input.entityId)
  ) {
    throw new Error("You do not have access to this entity.");
  }

  const amount = input.amount.trim();
  if (!amount || Number.isNaN(parseFloat(amount))) {
    throw new Error("A valid amount is required.");
  }

  const expense = await db.expense.create({
    data: {
      title: input.title.trim(),
      amount,
      currency: input.currency || "OMR",
      category: input.category.trim(),
      status: input.status,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      isRecurring: input.isRecurring,
      entityId: input.entityId || undefined,
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "Expense",
    resourceId: expense.id,
    metadata: { title: expense.title, amount: expense.amount.toString() },
  });

  revalidatePath("/expenses");
  return expense;
}

export async function listExpenses() {
  const ctx = await requireModuleAccess("EXPENSES");
  return db.expense.findMany({
    where: expenseEntityFilter(ctx),
    include: { entity: true },
    orderBy: { dueDate: "desc" },
  });
}
