import { db } from "@/lib/db";
import { formatBankAccountNumbers, type BankAccountNumberDisplay } from "@/lib/bank/account-numbers";
import { resolveBankAccountNumberRows } from "@/lib/bank/account-numbers";
import { ensureCashManagementSchema } from "@/lib/db/ensure-cash-management-schema";
import { isStaleBalance, toNumber } from "@/lib/cash/helpers";
import type { StatementAccountPrefill, StatementImportRow } from "@/lib/cash/statements/types";
import { cashPositionBankAccountFilter } from "@/lib/permissions/scoped-queries";
import { convertToOmr } from "@/lib/reports/helpers";
import type { UserContext } from "@/lib/permissions/types";

export type CashAccountRow = {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  accountNumbers: Array<{
    id?: string;
    accountNumber: string;
    currency: string;
    iban: string | null;
    label: string | null;
    currentBalance: number | null;
    balanceOmr: number | null;
    balanceAsOf: Date | null;
    isStale: boolean;
  }>;
  registeredAccounts: BankAccountNumberDisplay[];
  accountNumbersLabel: string;
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
  isMultiCurrency: boolean;
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
  currency: string;
  accountNumber: string | null;
  accountLabel: string | null;
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
    accountNumbers?: Array<{
      id: string;
      accountNumber: string;
      currency: string;
      iban: string | null;
      label: string | null;
      currentBalance: { toString(): string } | null;
      balanceAsOf: Date | null;
    }>;
  },
): Promise<CashAccountRow> {
  const registeredAccounts = resolveBankAccountNumberRows(account.accountNumbers ?? [], account);
  const accountNumbers = await Promise.all(
    registeredAccounts.map(async (row) => ({
      id: row.id,
      accountNumber: row.accountNumber,
      currency: row.currency,
      iban: row.iban,
      label: row.label,
      currentBalance: row.currentBalance,
      balanceOmr:
        row.currentBalance != null
          ? await convertToOmr(row.currentBalance, row.currency)
          : null,
      balanceAsOf: row.balanceAsOf,
      isStale: row.isStale,
    })),
  );

  const currencies = new Set(accountNumbers.map((row) => row.currency));
  const isMultiCurrency = currencies.size > 1;

  let balanceOmr = 0;
  let hasAnyBalance = false;
  let latestBalanceAsOf: Date | null = null;
  let anyStale = false;

  for (const row of accountNumbers) {
    if (row.currentBalance != null) {
      hasAnyBalance = true;
      balanceOmr += (await convertToOmr(row.currentBalance, row.currency)) ?? 0;
    }
    if (row.balanceAsOf && (!latestBalanceAsOf || row.balanceAsOf > latestBalanceAsOf)) {
      latestBalanceAsOf = row.balanceAsOf;
    }
    if (row.isStale) anyStale = true;
  }

  const primaryAccount = accountNumbers[0];
  const currentBalance =
    !isMultiCurrency && primaryAccount
      ? primaryAccount.currentBalance ?? toNumber(account.currentBalance)
      : null;

  return {
    id: account.id,
    accountName: account.accountName,
    bankName: account.bankName,
    accountNumber: account.accountNumber,
    accountNumbers,
    registeredAccounts,
    accountNumbersLabel: formatBankAccountNumbers(account.accountNumbers ?? [], account),
    iban: account.iban,
    currency: account.currency,
    entityId: account.entityId,
    entityName: account.entity?.name ?? null,
    currentBalance,
    balanceOmr: hasAnyBalance ? balanceOmr : null,
    balanceAsOf: latestBalanceAsOf ?? account.balanceAsOf,
    isStale: accountNumbers.length > 0 ? anyStale : isStaleBalance(account.balanceAsOf),
    notes: account.notes,
    includeInCashPosition: account.includeInCashPosition,
    isMultiCurrency,
  };
}

function sortBreakdown(rows: CashBreakdownRow[]) {
  return rows.sort((a, b) => b.totalOmr - a.totalOmr);
}

export async function getCashSummary(ctx: UserContext): Promise<CashSummary> {
  await ensureReady();

  const accounts = await db.bankAccount.findMany({
    where: cashPositionBankAccountFilter(ctx),
    include: {
      entity: { select: { name: true } },
      accountNumbers: { orderBy: { sortOrder: "asc" } },
    },
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
    const omr = row.balanceOmr ?? 0;
    totalOmr += omr;
    if (row.isStale) staleCount += 1;
    if (row.balanceAsOf && (!lastUpdated || row.balanceAsOf > lastUpdated)) {
      lastUpdated = row.balanceAsOf;
    }

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

    for (const accountNumber of row.accountNumbers) {
      const currencyEntry = byCurrency.get(accountNumber.currency) ?? {
        label: accountNumber.currency,
        totalOmr: 0,
        totalNative: 0,
        accountCount: 0,
      };
      currencyEntry.totalOmr += accountNumber.balanceOmr ?? 0;
      currencyEntry.totalNative += accountNumber.currentBalance ?? 0;
      currencyEntry.accountCount += 1;
      byCurrency.set(accountNumber.currency, currencyEntry);
    }
  }

  return {
    totalOmr,
    accountCount: accountRows.length,
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
    where: { id: accountId, ...cashPositionBankAccountFilter(ctx) },
    include: {
      entity: true,
      accountNumbers: { orderBy: { sortOrder: "asc" } },
    },
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
    where: { id: accountId, ...cashPositionBankAccountFilter(ctx) },
    select: { id: true },
  });
  if (!account) return [];

  const entries = await db.bankBalanceEntry.findMany({
    where: { bankAccountId: accountId },
    include: {
      recordedBy: {
        select: { firstName: true, lastName: true, email: true },
      },
      bankAccountNumber: {
        select: { accountNumber: true, currency: true, label: true },
      },
    },
    orderBy: [{ balanceDate: "desc" }, { createdAt: "desc" }],
  });

  return entries.map((entry) => ({
    id: entry.id,
    balance: toNumber(entry.balance) ?? 0,
    balanceDate: entry.balanceDate,
    currency: entry.bankAccountNumber?.currency ?? "OMR",
    accountNumber: entry.bankAccountNumber?.accountNumber ?? null,
    accountLabel: entry.bankAccountNumber
      ? [
          entry.bankAccountNumber.accountNumber,
          entry.bankAccountNumber.label,
        ]
          .filter(Boolean)
          .join(" · ")
      : null,
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
  const accountFilter = cashPositionBankAccountFilter(ctx);
  const accessibleAccounts = await db.bankAccount.findMany({
    where: accountFilter,
    select: {
      id: true,
      accountName: true,
      bankName: true,
      accountNumber: true,
      currency: true,
      accountNumbers: {
        orderBy: { sortOrder: "asc" },
        select: { accountNumber: true, currency: true },
      },
    },
  });
  const accountIds = accessibleAccounts.map((account) => account.id);
  const accountLabelMap = new Map(
    accessibleAccounts.map((account) => [
      account.id,
      `${account.accountName} · ${account.bankName} (${formatBankAccountNumbers(account.accountNumbers, account)})`,
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

export async function getCashStatementImportForPrefill(
  importId: string,
  ctx: UserContext,
): Promise<StatementAccountPrefill | null> {
  await ensureReady();

  const row = await db.cashStatementImport.findFirst({
    where: {
      id: importId,
      uploadedBy: ctx.id,
      status: { in: ["PARSED", "FAILED"] },
    },
  });

  if (!row) return null;

  const hasAccountDetails = Boolean(row.bankName || row.accountNumber || row.iban);
  if (!hasAccountDetails) return null;

  let extractedAccountName: string | null = null;
  if (row.extractedJson && typeof row.extractedJson === "object" && row.extractedJson !== null) {
    const json = row.extractedJson as { accountName?: string | null };
    extractedAccountName = json.accountName ?? null;
  }

  const fallbackName =
    extractedAccountName ??
    (row.bankName ? `${row.bankName} Account` : null) ??
    row.fileName.replace(/\.pdf$/i, "");

  return {
    importId: row.id,
    fileName: row.fileName,
    accountName: fallbackName,
    bankName: row.bankName,
    accountNumber: row.accountNumber,
    iban: row.iban,
    currency: row.currency,
    balance: toNumber(row.balance),
    balanceDate: row.balanceDate?.toISOString().slice(0, 10) ?? null,
    parserId: row.parserId,
  };
}

export async function listCashAccountCandidates(ctx: UserContext) {
  await ensureReady();

  return db.bankAccount.findMany({
    where: cashPositionBankAccountFilter(ctx),
    select: {
      id: true,
      accountName: true,
      bankName: true,
      accountNumber: true,
      iban: true,
      currency: true,
      entityId: true,
      accountNumbers: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, accountNumber: true, currency: true, label: true },
      },
    },
    orderBy: [{ bankName: "asc" }, { accountName: "asc" }],
  });
}

export async function listCashEntities(ctx: UserContext) {
  await ensureReady();
  const filter = cashPositionBankAccountFilter(ctx);

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
