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
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { cashPositionBankAccountFilter } from "@/lib/permissions/scoped-queries";
import { syncBankBalancesToCashAssets } from "@/lib/portfolio/cash-sync";
export type CashAccountInput = {
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
  statementImportId?: string;
};

async function replaceBankAccountNumbers(bankAccountId: string, accounts: BankAccountNumberInput[]) {
  await db.bankAccountNumber.deleteMany({ where: { bankAccountId } });
  if (accounts.length === 0) return;

  await db.bankAccountNumber.createMany({
    data: accounts.map((account, index) => ({
      bankAccountId,
      accountNumber: account.accountNumber,
      currency: account.currency?.trim() || "OMR",
      label: account.label?.trim() || null,
      sortOrder: index,
    })),
  });
}

function parseDecimal(value?: string | null) {
  if (!value || value.trim() === "") return undefined;
  const num = parseFloat(value.trim());
  if (Number.isNaN(num)) throw new Error("Invalid amount.");
  return value.trim();
}

function parseDate(value?: string | null) {
  if (!value || value.trim() === "") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date.");
  return date;
}

function assertEntityAccess(
  ctx: Awaited<ReturnType<typeof requireModuleAccess>>,
  entityId?: string,
) {
  if (entityId && ctx.entityIds.length > 0 && !ctx.entityIds.includes(entityId)) {
    throw new Error("You do not have access to this entity.");
  }
}

function revalidateCashPaths(accountId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/cash");
  revalidatePath("/assets/bank-details");
  if (accountId) {
    revalidatePath("/cash/" + accountId);
    revalidatePath("/cash/" + accountId + "/edit");
    revalidatePath("/assets/bank-details/" + accountId);
  }
}

export async function createCashAccount(input: CashAccountInput) {
  const ctx = await requireModuleAccess("CASH_MANAGEMENT");
  if (!canWrite(ctx, "CASH_MANAGEMENT")) {
    throw new Error("You do not have permission to create bank accounts.");
  }

  await ensureCashManagementSchema();
  assertEntityAccess(ctx, input.entityId);

  const accounts = requireBankAccountNumbers(input);
  const legacy = toLegacyBankAccountFields(accounts);

  const account = await db.bankAccount.create({
    data: {
      accountName: input.accountName.trim(),
      bankName: input.bankName.trim(),
      accountNumber: legacy.accountNumber,
      iban: input.iban?.trim() || undefined,
      swiftCode: input.swiftCode?.trim() || undefined,
      sortCode: input.sortCode?.trim() || undefined,
      currency: legacy.currency,
      entityId: input.entityId || undefined,
      notes: input.notes?.trim() || undefined,
      isActive: true,
      includeInCashPosition: input.includeInCashPosition ?? true,
      accountNumbers: {
        create: accounts.map((row, index) => ({
          accountNumber: row.accountNumber,
          currency: row.currency?.trim() || "OMR",
          label: row.label?.trim() || null,
          sortOrder: index,
        })),
      },
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "BankAccount",
    resourceId: account.id,
    metadata: { accountName: account.accountName, bankName: account.bankName },
  });

  if (input.statementImportId) {
    const statementImport = await db.cashStatementImport.findFirst({
      where: {
        id: input.statementImportId,
        uploadedBy: ctx.id,
        status: "PARSED",
      },
    });

    if (statementImport?.balance != null && statementImport.balanceDate) {
      await applyCashStatementImport({
        importId: statementImport.id,
        bankAccountId: account.id,
        balance: statementImport.balance.toString(),
        balanceDate: statementImport.balanceDate.toISOString().slice(0, 10),
      });
    }
  } else {
    revalidateCashPaths(account.id);
  }

  return account;
}

export async function updateCashAccount(id: string, input: CashAccountInput) {
  const ctx = await requireModuleAccess("CASH_MANAGEMENT");
  if (!canWrite(ctx, "CASH_MANAGEMENT")) {
    throw new Error("You do not have permission to update bank accounts.");
  }

  await ensureCashManagementSchema();
  assertEntityAccess(ctx, input.entityId);

  const account = await db.bankAccount.findFirst({
    where: { id, ...cashPositionBankAccountFilter(ctx) },
  });
  if (!account) throw new Error("Bank account not found.");

  const accounts = requireBankAccountNumbers(input);
  const legacy = toLegacyBankAccountFields(accounts);
  const includeInCashPosition = input.includeInCashPosition ?? true;
  const usageChanged = account.includeInCashPosition !== includeInCashPosition;

  const updated = await db.bankAccount.update({
    where: { id },
    data: {
      accountName: input.accountName.trim(),
      bankName: input.bankName.trim(),
      accountNumber: legacy.accountNumber,
      iban: input.iban?.trim() || undefined,
      swiftCode: input.swiftCode?.trim() || undefined,
      sortCode: input.sortCode?.trim() || undefined,
      currency: legacy.currency,
      entityId: input.entityId || undefined,
      notes: input.notes?.trim() || undefined,
      includeInCashPosition,
    },
  });

  await replaceBankAccountNumbers(id, accounts);

  if (includeInCashPosition || usageChanged || account.includeInCashPosition) {
    await syncBankBalancesToCashAssets(ctx);
  }

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "BankAccount",
    resourceId: id,
    metadata: { accountName: updated.accountName },
  });

  revalidateCashPaths(id);
  return updated;
}

export async function updateCashAccountNotes(id: string, notes: string) {
  const ctx = await requireModuleAccess("CASH_MANAGEMENT");
  if (!canWrite(ctx, "CASH_MANAGEMENT")) {
    throw new Error("You do not have permission to update bank accounts.");
  }

  await ensureCashManagementSchema();

  const account = await db.bankAccount.findFirst({
    where: { id, ...cashPositionBankAccountFilter(ctx) },
  });
  if (!account) throw new Error("Bank account not found.");

  await db.bankAccount.update({
    where: { id },
    data: { notes: notes.trim() || null },
  });

  revalidateCashPaths(id);
}

export async function recordCashBalance(formData: FormData) {
  const ctx = await requireModuleAccess("CASH_MANAGEMENT");
  if (!canWrite(ctx, "CASH_MANAGEMENT")) {
    throw new Error("You do not have permission to update balances.");
  }

  await ensureCashManagementSchema();

  const bankAccountId = String(formData.get("bankAccountId") ?? "").trim();
  const balanceRaw = String(formData.get("balance") ?? "").trim();
  const balanceDateRaw = String(formData.get("balanceDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || undefined;

  if (!bankAccountId) throw new Error("Bank account is required.");
  const balance = parseDecimal(balanceRaw);
  if (!balance) throw new Error("Balance is required.");
  const balanceDate = parseDate(balanceDateRaw);
  if (!balanceDate) throw new Error("Balance date is required.");

  const account = await db.bankAccount.findFirst({
    where: { id: bankAccountId, ...cashPositionBankAccountFilter(ctx) },
  });
  if (!account) throw new Error("Bank account not found.");

  const entry = await db.bankBalanceEntry.create({
    data: {
      bankAccountId,
      balance,
      balanceDate,
      notes,
      recordedById: ctx.id,
    },
  });

  await db.bankAccount.update({
    where: { id: bankAccountId },
    data: {
      currentBalance: balance,
      balanceAsOf: balanceDate,
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "BankBalanceEntry",
    resourceId: entry.id,
    metadata: {
      bankAccountId,
      balance,
      balanceDate: balanceDate.toISOString(),
    },
  });

  await syncBankBalancesToCashAssets(ctx);
  revalidateCashPaths(bankAccountId);
}

export async function deactivateCashAccount(id: string) {
  const ctx = await requireModuleAccess("CASH_MANAGEMENT");
  if (!canWrite(ctx, "CASH_MANAGEMENT")) {
    throw new Error("You do not have permission to deactivate accounts.");
  }

  await ensureCashManagementSchema();

  const account = await db.bankAccount.findFirst({
    where: { id, ...cashPositionBankAccountFilter(ctx) },
  });
  if (!account) throw new Error("Bank account not found.");

  await db.bankAccount.update({
    where: { id },
    data: { isActive: false },
  });

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "BankAccount",
    resourceId: id,
    metadata: { action: "deactivate", accountName: account.accountName },
  });

  await syncBankBalancesToCashAssets(ctx);
  revalidateCashPaths(id);
}

export async function applyCashStatementImport(input: {
  importId: string;
  bankAccountId: string;
  balance: string;
  balanceDate: string;
}) {
  const ctx = await requireModuleAccess("CASH_MANAGEMENT");
  if (!canWrite(ctx, "CASH_MANAGEMENT")) {
    throw new Error("You do not have permission to update balances.");
  }

  await ensureCashManagementSchema();

  const statementImport = await db.cashStatementImport.findUnique({
    where: { id: input.importId },
  });
  if (!statementImport) throw new Error("Statement import not found.");
  if (statementImport.status === "APPLIED") {
    throw new Error("This statement import has already been applied.");
  }
  if (statementImport.uploadedBy !== ctx.id && !ctx.isSuperAdmin) {
    throw new Error("You can only apply statement imports you uploaded.");
  }

  const bankAccountId = input.bankAccountId.trim();
  const balance = parseDecimal(input.balance);
  if (!balance) throw new Error("Balance is required.");
  const balanceDate = parseDate(input.balanceDate);
  if (!balanceDate) throw new Error("Balance date is required.");

  const account = await db.bankAccount.findFirst({
    where: { id: bankAccountId, ...cashPositionBankAccountFilter(ctx) },
  });
  if (!account) throw new Error("Bank account not found.");

  const entry = await db.bankBalanceEntry.create({
    data: {
      bankAccountId,
      balance,
      balanceDate,
      notes: `Imported from ${statementImport.fileName}`,
      recordedById: ctx.id,
      statementImportId: statementImport.id,
    },
  });

  await db.bankAccount.update({
    where: { id: bankAccountId },
    data: {
      currentBalance: balance,
      balanceAsOf: balanceDate,
    },
  });

  await db.cashStatementImport.update({
    where: { id: statementImport.id },
    data: {
      status: "APPLIED",
      bankAccountId,
      balance,
      balanceDate,
      currency: account.currency,
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "cash_statement_import",
    resourceId: statementImport.id,
    metadata: {
      bankAccountId,
      fileName: statementImport.fileName,
      balanceEntryId: entry.id,
    },
  });

  await syncBankBalancesToCashAssets(ctx);
  revalidateCashPaths(bankAccountId);
}
