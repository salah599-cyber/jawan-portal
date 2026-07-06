import { db } from "@/lib/db";
import { ensureCashManagementSchema } from "@/lib/db/ensure-cash-management-schema";
import { isStaleBalance, toNumber } from "@/lib/cash/helpers";
import type { StatementImportRow } from "@/lib/cash/statements/types";
import { cashBankAccountFilter } from "@/lib/permissions/scoped-queries";
import { convertToOmr } from "@/lib/reports/helpers";
import type { UserContext } from "@/lib/permissions/types";

export type CashAccountRow = {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  iban: string | null;
  currency: string;
  entityId: string | null;
  entityName: string | null;
  currentBalance: number | null;
  balanceOmr: number | null;
  balanceAsOf: Date | null;
  isStale: boolean;
  notes: string | null;
  includeInCashPosition: boolean;
};

export type CashBreakdownRow = {
  label: string;
  totalOmr: number;
  accountCount: number;
};

export type CashSummary = {
  totalOmr: number;
  accountCount: number;
  staleCount: number;
  lastUpdated: Date | null;
  byBank: CashBreakdownRow[];
  byEntity: CashBreakdownRow[];
  byCurrency: Array<CashBreakdownRow & { totalNative: number }>;
  accounts: CashAccountRow[];
};

export type CashBalanceHistoryEntry = {
  id: string;
  balance: number;
  balanceDate: Date;
  notes: string | null;
  recordedByName: string | null;
  createdAt: Date;
};

async function ensureReady() {
  await ensureCashManagementSchema();
}

async function accountToRow(
  account: {
    id: string;
    accountName: string;
    bankName: string;
    accountNumber: string;
    iban: string | null;
    currency: string;
    entityId: string | null;
    entity: { name: string } | null;
    currentBalance: { toString(): string } | null;
    balanceAsOf: Date | null;
    notes: string | null;
    includeInCashPosition: boolean;
  },
): Promise<CashAccountRow> {
  const currentBalance = toNumber(account.currentBalance);
  const balanceOmr =
    currentBalance != null ? await convertToOmr(currentBalance, account.currency) : null;

  return {
    id: account.id,
    accountName: account.accountName,
    bankName: account.bankName,
    accountNumber: account.accountNumber,
    iban: account.iban,
    currency: account.currency,
    entityId: account.entityId,
    entityName: account.entity?.name ?? null,
    currentBalance,
    balanceOmr,
    balanceAsOf: account.balanceAsOf,
    isStale: isStaleBalance(account.balanceAsOf),
    notes: account.notes,
    includeInCashPosition: account.includeInCashPosition,
  };
}

function sortBreakdown(rows: CashBreakdownRow[]) {
  return rows.sort((a, b) => b.totalOmr - a.totalOmr);
}

export async function getCashSummary(ctx: UserContext): Promise<CashSummary> {
  await ensureReady();

  const accounts = await db.bankAccount.findMany({
    where: cashBankAccountFilter(ctx),
    include: { entity: { select: { name: true } } },
    orderBy: [{ bankName: "asc" }, { accountName: "asc" }],
  });

  const accountRows = await Promise.all(accounts.map(accountToRow));

  const byBank = new Map<string, CashBreakdownRow>();
  const byEntity = new Map<string, CashBreakdownRow>();
  const byCurrency = new Map<string, CashBreakdownRow & { totalNative: number }>();

  let totalOmr = 0;
  let staleCount = 0;
  let lastUpdated: Date | null = null;

  for (const row of accountRows) {
    const omr = row.includeInCashPosition ? (row.balanceOmr ?? 0) : 0;
    if (row.includeInCashPosition) {
      totalOmr += omr;
      if (row.isStale) staleCount += 1;
      if (row.balanceAsOf && (!lastUpdated || row.balanceAsOf > lastUpdated)) {
        lastUpdated = row.balanceAsOf;
      }
    }

    if (!row.includeInCashPosition) continue;

    const bankEntry = byBank.get(row.bankName) ?? {
      label: row.bankName,
      totalOmr: 0,
      accountCount: 0,
    };
    bankEntry.totalOmr += omr;
    bankEntry.accountCount += 1;
    byBank.set(row.bankName, bankEntry);

    const entityLabel = row.entityName ?? "Unassigned";
    const entityEntry = byEntity.get(entityLabel) ?? {
      label: entityLabel,
      totalOmr: 0,
      accountCount: 0,
    };
    entityEntry.totalOmr += omr;
    entityEntry.accountCount += 1;
    byEntity.set(entityLabel, entityEntry);

    const currencyEntry = byCurrency.get(row.currency) ?? {
      label: row.currency,
      totalOmr: 0,
      totalNative: 0,
      accountCount: 0,
    };
    currencyEntry.totalOmr += omr;
    currencyEntry.totalNative += row.currentBalance ?? 0;
    currencyEntry.accountCount += 1;
    byCurrency.set(row.currency, currencyEntry);
  }

  return {
    totalOmr,
    accountCount: accountRows.filter((row) => row.includeInCashPosition).length,
    staleCount,
    lastUpdated,
    byBank: sortBreakdown([...byBank.values()]),
    byEntity: sortBreakdown([...byEntity.values()]),
    byCurrency: [...byCurrency.values()].sort((a, b) => b.totalOmr - a.totalOmr),
    accounts: accountRows,
  };
}

export async function getCashAccount(accountId: string, ctx: UserContext) {
  await ensureReady();

  const account = await db.bankAccount.findFirst({
    where: { id: accountId, ...cashBankAccountFilter(ctx) },
    include: { entity: true },
  });

  if (!account) return null;
  return accountToRow(account);
}

export async function getCashBalanceHistory(
  accountId: string,
  ctx: UserContext,
): Promise<CashBalanceHistoryEntry[]> {
  await ensureReady();

  const account = await db.bankAccount.findFirst({
    where: { id: accountId, ...cashBankAccountFilter(ctx) },
    select: { id: true },
  });
  if (!account) return [];

  const entries = await db.bankBalanceEntry.findMany({
    where: { bankAccountId: accountId },
    include: {
      recordedBy: {
        select: { firstName: true, lastName: true, email: true },
      },
    },
    orderBy: [{ balanceDate: "desc" }, { createdAt: "desc" }],
  });

  return entries.map((entry) => ({
    id: entry.id,
    balance: toNumber(entry.balance) ?? 0,
    balanceDate: entry.balanceDate,
    notes: entry.notes,
    recordedByName: entry.recordedBy
      ? [entry.recordedBy.firstName, entry.recordedBy.lastName].filter(Boolean).join(" ") ||
        entry.recordedBy.email
      : null,
    createdAt: entry.createdAt,
  }));
}

export async function getCashStatementImports(
  ctx: UserContext,
  options: { bankAccountId?: string; limit?: number } = {},
): Promise<StatementImportRow[]> {
  await ensureReady();

  const limit = options.limit ?? 20;
  const accountFilter = cashBankAccountFilter(ctx);
  const accessibleAccounts = await db.bankAccount.findMany({
    where: accountFilter,
    select: { id: true, accountName: true, bankName: true, accountNumber: true },
  });
  const accountIds = accessibleAccounts.map((account) => account.id);
  const accountLabelMap = new Map(
    accessibleAccounts.map((account) => [
      account.id,
      `${account.accountName} · ${account.bankName} (${account.accountNumber})`,
    ]),
  );

  const imports = await db.cashStatementImport.findMany({
    where: {
      uploadedBy: ctx.id,
      ...(options.bankAccountId
        ? { bankAccountId: options.bankAccountId }
        : {
            OR: [{ bankAccountId: null }, { bankAccountId: { in: accountIds } }],
          }),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return imports.map((row) => ({
    id: row.id,
    fileName: row.fileName,
    uploadedBy: row.uploadedBy,
    bankAccountId: row.bankAccountId,
    bankAccountLabel: row.bankAccountId ? accountLabelMap.get(row.bankAccountId) ?? null : null,
    parserId: row.parserId,
    balance: toNumber(row.balance),
    balanceDate: row.balanceDate,
    currency: row.currency,
    status: row.status,
    warnings: Array.isArray(row.warnings) ? (row.warnings as string[]) : [],
    createdAt: row.createdAt,
  }));
}

export async function listCashAccountCandidates(ctx: UserContext) {
  await ensureReady();

  return db.bankAccount.findMany({
    where: cashBankAccountFilter(ctx),
    select: {
      id: true,
      accountName: true,
      bankName: true,
      accountNumber: true,
      iban: true,
      currency: true,
      entityId: true,
    },
    orderBy: [{ bankName: "asc" }, { accountName: "asc" }],
  });
}

export async function listCashEntities(ctx: UserContext) {
  await ensureReady();
  const filter = cashBankAccountFilter(ctx);

  const entityIds = await db.bankAccount.findMany({
    where: { ...filter, entityId: { not: null } },
    select: { entityId: true },
    distinct: ["entityId"],
  });

  if (entityIds.length === 0) {
    return db.entity.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  }

  return db.entity.findMany({
    where: { id: { in: entityIds.map((row) => row.entityId!).filter(Boolean) } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
