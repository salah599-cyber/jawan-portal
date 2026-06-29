"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit/log";
import { canWrite, getModulePermission, requireModuleAccess } from "@/lib/permissions/access";
import type { UserContext } from "@/lib/permissions/types";

export type CreateBankAccountInput = {
  accountName: string;
  bankName: string;
  accountNumber: string;
  iban?: string;
  swiftCode?: string;
  sortCode?: string;
  currency: string;
  entityId?: string;
  notes?: string;
};

function bankAccountFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "ASSETS");
  if (level === "FULL" || level === "READ") return {};
  if (level === "FILTERED") return { entityId: { in: ctx.entityIds } };
  return { id: "__none__" };
}

export async function createBankAccount(input: CreateBankAccountInput) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to create bank accounts.");
  }

  if (
    input.entityId &&
    ctx.entityIds.length > 0 &&
    !ctx.entityIds.includes(input.entityId)
  ) {
    throw new Error("You do not have access to this entity.");
  }

  const account = await db.bankAccount.create({
    data: {
      accountName: input.accountName.trim(),
      bankName: input.bankName.trim(),
      accountNumber: input.accountNumber.trim(),
      iban: input.iban?.trim() || undefined,
      swiftCode: input.swiftCode?.trim() || undefined,
      sortCode: input.sortCode?.trim() || undefined,
      currency: input.currency || "OMR",
      entityId: input.entityId || undefined,
      notes: input.notes?.trim() || undefined,
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "BankAccount",
    resourceId: account.id,
    metadata: { accountName: account.accountName, bankName: account.bankName },
  });

  revalidatePath("/assets/bank-details");
  return account;
}

export async function listBankAccounts() {
  const ctx = await requireModuleAccess("ASSETS");
  return db.bankAccount.findMany({
    where: bankAccountFilter(ctx),
    include: { entity: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function deleteBankAccount(id: string) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to delete bank accounts.");
  }

  const account = await db.bankAccount.findFirst({
    where: { id, ...bankAccountFilter(ctx) },
  });
  if (!account) throw new Error("Bank account not found.");

  await db.bankAccount.delete({ where: { id } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "BankAccount",
    resourceId: id,
    metadata: { accountName: account.accountName },
  });

  revalidatePath("/assets/bank-details");
}
