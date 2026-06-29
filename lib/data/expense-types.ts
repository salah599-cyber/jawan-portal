import { db } from "@/lib/db";
import { EXPENSE_CATEGORY_OPTIONS } from "@/lib/labels";

export async function ensureDefaultExpenseTypes() {
  const count = await db.expenseType.count();
  if (count > 0) return;

  await db.expenseType.createMany({
    data: EXPENSE_CATEGORY_OPTIONS.map((name, index) => ({
      name,
      sortOrder: index,
      isActive: true,
    })),
    skipDuplicates: true,
  });
}

async function backfillExpenseTypeLinks() {
  const unlinked = await db.expense.findMany({
    where: { expenseTypeId: null },
    select: { id: true, category: true },
  });

  for (const expense of unlinked) {
    const trimmed = expense.category.trim();
    if (!trimmed) continue;

    let type = await db.expenseType.findFirst({ where: { name: trimmed } });
    if (!type) {
      const maxOrder = await db.expenseType.aggregate({ _max: { sortOrder: true } });
      type = await db.expenseType.create({
        data: {
          name: trimmed,
          sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        },
      });
    }

    await db.expense.update({
      where: { id: expense.id },
      data: { expenseTypeId: type.id },
    });
  }
}

export async function listExpenseTypes() {
  await ensureDefaultExpenseTypes();
  await backfillExpenseTypeLinks();
  return db.expenseType.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createExpenseType(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Expense type name is required.");

  await ensureDefaultExpenseTypes();

  const existing = await db.expenseType.findUnique({ where: { name: trimmed } });
  if (existing) {
    if (!existing.isActive) {
      return db.expenseType.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
    }
    return existing;
  }

  const maxOrder = await db.expenseType.aggregate({ _max: { sortOrder: true } });
  return db.expenseType.create({
    data: {
      name: trimmed,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });
}

export async function resolveExpenseType(typeId?: string, categoryFallback?: string) {
  await ensureDefaultExpenseTypes();

  if (typeId) {
    const type = await db.expenseType.findFirst({
      where: { id: typeId, isActive: true },
    });
    if (!type) throw new Error("Expense type not found.");
    return type;
  }

  const fallback = categoryFallback?.trim();
  if (fallback) {
    const type = await db.expenseType.findFirst({ where: { name: fallback, isActive: true } });
    if (type) return type;
    return createExpenseType(fallback);
  }

  throw new Error("Expense type is required.");
}
