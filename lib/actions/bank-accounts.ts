"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit/log";
import {
  requireBankAccountNumbers,
  toLegacyBankAccountFields,
  type BankAccountNumberInput,
} from "@/lib/bank/account-numbers";
import { ensureCashManagementSchema } from "@/lib/db/ensure-cash-management-schema";
import { canAccess, canWrite, getModulePermission, requireModuleAccess } from "@/lib/permissions/access";
import type { UserContext } from "@/lib/permissions/types";
import { syncBankBalancesToCashAssets } from "@/lib/portfolio/cash-sync";

export type CreateBankAccountInput = {
  accountName: string;
  bankName: string;
  accountNumber?: string;
  accounts?: BankAccountNumberInput[];
  iban?: string;
  swiftCode?: string;
  sortCode?: string;
  currency?: string;
  entityId?: string;
  notes?: string;
  includeInCashPosition?: boolean;
  includeInTransferLetterSource?: boolean;
};

const bankAccountInclude = {
  entity: true,
  accountNumbers: { orderBy: { sortOrder: "asc" as const } },
  cheques: {
    where: { deletedAt: null },
    select: {
      id: true,
      chequeNumber: true,
      amount: true,
      currency: true,
      status: true,
      direction: true,
      payee: true,
      issueDate: true,
      dueDate: true,
    },
    orderBy: { issueDate: "desc" as const },
    take: 25,
  },
} as const;

function bankAccountFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "ASSETS");
  if (level === "FULL" || level === "READ") return {};
  if (level === "FILTERED") return { entityId: { in: ctx.entityIds } };
  return { id: "__none__" };
}

async function syncCashIfNeeded(ctx: UserContext) {
  if (!canAccess(ctx, "CASH_MANAGEMENT")) return;
  await syncBankBalancesToCashAssets(ctx);
  revalidatePath("/dashboard");
  revalidatePath("/cash");
}

async function replaceBankAccountNumbers(bankAccountId: string, accounts: BankAccountNumberInput[]) {
  await db.bankAccountNumber.deleteMany({ where: { bankAccountId } });
  if (accounts.length === 0) return;

  await db.bankAccountNumber.createMany({
    data: accounts.map((account, index) => ({
      bankAccountId,
      accountNumber: account.accountNumber,
      currency: account.currency?.trim() || "OMR",
      iban: account.iban?.trim() || null,
      label: account.label?.trim() || null,
      sortOrder: index,
    })),
  });
}

export async function createBankAccount(input: CreateBankAccountInput) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to create bank accounts.");
  }

  await ensureCashManagementSchema();

  if (
    input.entityId &&
    ctx.entityIds.length > 0 &&
    !ctx.entityIds.includes(input.entityId)
  ) {
    throw new Error("You do not have access to this entity.");
  }

  const accounts = requireBankAccountNumbers(input);
  const legacy = toLegacyBankAccountFields(accounts);

  const account = await db.bankAccount.create({
    data: {
      accountName: input.accountName.trim(),
      bankName: input.bankName.trim(),
      accountNumber: legacy.accountNumber,
      iban: legacy.iban,
      swiftCode: input.swiftCode?.trim() || undefined,
      sortCode: input.sortCode?.trim() || undefined,
      currency: legacy.currency,
      entityId: input.entityId || undefined,
      notes: input.notes?.trim() || undefined,
      isActive: true,
      includeInCashPosition: input.includeInCashPosition ?? false,
      includeInTransferLetterSource: input.includeInTransferLetterSource ?? false,
      accountNumbers: {
        create: accounts.map((row, index) => ({
          accountNumber: row.accountNumber,
          currency: row.currency?.trim() || "OMR",
          iban: row.iban?.trim() || null,
          label: row.label?.trim() || null,
          sortOrder: index,
        })),
      },
    },
    include: bankAccountInclude,
  });

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "BankAccount",
    resourceId: account.id,
    metadata: {
      accountName: account.accountName,
      bankName: account.bankName,
      includeInCashPosition: account.includeInCashPosition,
      includeInTransferLetterSource: account.includeInTransferLetterSource,
    },
  });

  if (account.includeInCashPosition) {
    await syncCashIfNeeded(ctx);
  }

  revalidatePath("/assets/bank-details");
  revalidatePath("/assets/bank-details/" + account.id);
  revalidatePath("/transfer-letters");
  revalidatePath("/transfer-letters/new");
  return account;
}

export async function listBankAccounts() {
  const ctx = await requireModuleAccess("ASSETS");
  await ensureCashManagementSchema();
  return db.bankAccount.findMany({
    where: bankAccountFilter(ctx),
    include: {
      entity: true,
      accountNumbers: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function deleteBankAccount(id: string) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to delete bank accounts.");
  }

  await ensureCashManagementSchema();

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

  if (account.includeInCashPosition) {
    await syncCashIfNeeded(ctx);
  }

  revalidatePath("/assets/bank-details");
}

export async function getBankAccount(id: string) {
  const ctx = await requireModuleAccess("ASSETS");
  await ensureCashManagementSchema();
  return db.bankAccount.findFirst({
    where: { id, ...bankAccountFilter(ctx) },
    include: bankAccountInclude,
  });
}

export async function updateBankAccount(id: string, input: CreateBankAccountInput) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to update bank accounts.");
  }

  await ensureCashManagementSchema();

  const account = await db.bankAccount.findFirst({
    where: { id, ...bankAccountFilter(ctx) },
  });
  if (!account) throw new Error("Bank account not found.");

  if (
    input.entityId &&
    ctx.entityIds.length > 0 &&
    !ctx.entityIds.includes(input.entityId)
  ) {
    throw new Error("You do not have access to this entity.");
  }

  const accounts = requireBankAccountNumbers(input);
  const legacy = toLegacyBankAccountFields(accounts);
  const includeInCashPosition = input.includeInCashPosition ?? false;
  const includeInTransferLetterSource = input.includeInTransferLetterSource ?? false;
  const usageChanged = account.includeInCashPosition !== includeInCashPosition;

  await db.bankAccount.update({
    where: { id },
    data: {
      accountName: input.accountName.trim(),
      bankName: input.bankName.trim(),
      accountNumber: legacy.accountNumber,
      iban: legacy.iban,
      swiftCode: input.swiftCode?.trim() || undefined,
      sortCode: input.sortCode?.trim() || undefined,
      currency: legacy.currency,
      entityId: input.entityId || undefined,
      notes: input.notes?.trim() || undefined,
      includeInCashPosition,
      includeInTransferLetterSource,
    },
  });

  await replaceBankAccountNumbers(id, accounts);

  const refreshed = await db.bankAccount.findFirst({
    where: { id },
    include: bankAccountInclude,
  });
  if (!refreshed) throw new Error("Bank account not found.");

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "BankAccount",
    resourceId: id,
    metadata: {
      accountName: refreshed.accountName,
      includeInCashPosition: refreshed.includeInCashPosition,
      includeInTransferLetterSource: refreshed.includeInTransferLetterSource,
    },
  });

  if (includeInCashPosition || usageChanged || account.includeInCashPosition) {
    await syncCashIfNeeded(ctx);
  }

  revalidatePath("/assets/bank-details");
  revalidatePath("/assets/bank-details/" + id);
  revalidatePath("/assets/bank-details/" + id + "/edit");
  revalidatePath("/transfer-letters");
  revalidatePath("/transfer-letters/new");
  return refreshed;
}
