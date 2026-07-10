import type { DbClient } from "@/lib/db";
import { db } from "@/lib/db";
import { ensureCashManagementSchema } from "@/lib/db/ensure-cash-management-schema";
import { ensureExitSettlementSchema } from "@/lib/db/ensure-exit-settlement-schema";

const SUSPENSE_ACCOUNT_NAME = "Exit Proceeds (Suspense)";

function toNum(value: { toString(): string } | number | null | undefined): number {
  if (value == null) return 0;
  const num = typeof value === "number" ? value : parseFloat(value.toString());
  return Number.isNaN(num) ? 0 : num;
}

function formatBalance(value: number): string {
  return value.toFixed(3);
}

async function findSuspenseAccount(
  client: DbClient,
  entityId: string,
  currency: string,
) {
  return client.bankAccount.findFirst({
    where: {
      entityId,
      currency,
      isExitSuspense: true,
      isActive: true,
    },
  });
}

export async function ensureExitSuspenseAccount(
  entityId: string,
  currency: string,
  client: DbClient = db,
) {
  await ensureCashManagementSchema();
  await ensureExitSettlementSchema();

  const existing = await findSuspenseAccount(client, entityId, currency);
  if (existing) return existing;

  return client.bankAccount.create({
    data: {
      entityId,
      currency,
      accountName: SUSPENSE_ACCOUNT_NAME,
      bankName: "Internal",
      accountNumber: `SUSPENSE-${entityId.slice(0, 8)}-${currency}`,
      notes: "System account holding exit proceeds until assigned to a bank account. Excluded from net worth.",
      isActive: true,
      includeInCashPosition: false,
      isExitSuspense: true,
      currentBalance: "0",
      balanceAsOf: new Date(),
    },
  });
}

export async function adjustBankAccountBalance(
  bankAccountId: string,
  delta: number,
  balanceDate: Date,
  notes: string,
  recordedById?: string,
  client: DbClient = db,
) {
  const account = await client.bankAccount.findUnique({ where: { id: bankAccountId } });
  if (!account) throw new Error("Bank account not found.");

  const nextBalance = toNum(account.currentBalance) + delta;
  if (nextBalance < -0.0001) {
    throw new Error("Bank account balance cannot go negative.");
  }

  await client.bankBalanceEntry.create({
    data: {
      bankAccountId,
      balance: formatBalance(nextBalance),
      balanceDate,
      notes,
      recordedById,
    },
  });

  await client.bankAccount.update({
    where: { id: bankAccountId },
    data: {
      currentBalance: formatBalance(nextBalance),
      balanceAsOf: balanceDate,
    },
  });

  return nextBalance;
}

export async function parkExitProceedsInSuspense(input: {
  entityId: string;
  currency: string;
  amount: string;
  balanceDate: Date;
  description: string;
  recordedById?: string;
  client?: DbClient;
}) {
  const client = input.client ?? db;
  const amount = parseFloat(input.amount);
  if (Number.isNaN(amount) || amount <= 0) {
    throw new Error("A positive proceeds amount is required.");
  }

  const suspense = await ensureExitSuspenseAccount(input.entityId, input.currency, client);
  await adjustBankAccountBalance(
    suspense.id,
    amount,
    input.balanceDate,
    input.description,
    input.recordedById,
    client,
  );

  return suspense;
}

export async function transferExitProceedsFromSuspense(input: {
  suspenseBankAccountId: string;
  targetBankAccountId: string;
  amount: string;
  balanceDate: Date;
  description: string;
  recordedById?: string;
  client?: DbClient;
}) {
  const client = input.client ?? db;
  const amount = parseFloat(input.amount);
  if (Number.isNaN(amount) || amount <= 0) {
    throw new Error("A positive proceeds amount is required.");
  }

  const [suspense, target] = await Promise.all([
    client.bankAccount.findUnique({ where: { id: input.suspenseBankAccountId } }),
    client.bankAccount.findUnique({ where: { id: input.targetBankAccountId } }),
  ]);

  if (!suspense?.isExitSuspense) throw new Error("Suspense account not found.");
  if (!target || target.isExitSuspense) throw new Error("Destination bank account not found.");
  if (target.currency !== suspense.currency) {
    throw new Error("Destination account currency must match the exit proceeds currency.");
  }

  await adjustBankAccountBalance(
    suspense.id,
    -amount,
    input.balanceDate,
    `Transfer out: ${input.description}`,
    input.recordedById,
    client,
  );

  await adjustBankAccountBalance(
    target.id,
    amount,
    input.balanceDate,
    `Exit proceeds: ${input.description}`,
    input.recordedById,
    client,
  );

  return target;
}
