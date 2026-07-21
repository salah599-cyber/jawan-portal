import { isStaleBalance, toNumber } from "@/lib/cash/helpers";

export type BankAccountNumberInput = {
  accountNumber: string;
  currency?: string;
  iban?: string;
  label?: string;
  includeInTransferLetterSource?: boolean;
};

export type BankAccountNumberRecord = {
  id?: string;
  accountNumber: string;
  currency: string;
  iban?: string | null;
  label?: string | null;
  includeInTransferLetterSource?: boolean;
  currentBalance?: { toString(): string } | number | null;
  balanceAsOf?: Date | null;
};

export type BankAccountNumberDisplay = {
  id?: string;
  accountNumber: string;
  currency: string;
  label: string | null;
  iban: string | null;
  includeInTransferLetterSource: boolean;
  currentBalance: number | null;
  balanceAsOf: Date | null;
  isStale: boolean;
};

export function normalizeBankAccountNumbers(input: {
  accountNumber?: string;
  currency?: string;
  iban?: string;
  accounts?: BankAccountNumberInput[];
}): BankAccountNumberInput[] {
  const fromAccounts = (input.accounts ?? [])
    .map((row) => ({
      accountNumber: row.accountNumber.trim(),
      currency: row.currency?.trim() || "OMR",
      iban: row.iban?.trim() || undefined,
      label: row.label?.trim() || undefined,
      includeInTransferLetterSource: row.includeInTransferLetterSource ?? false,
    }))
    .filter((row) => row.accountNumber);

  if (fromAccounts.length > 0) return fromAccounts;

  const legacyNumber = input.accountNumber?.trim();
  if (legacyNumber) {
    return [{
      accountNumber: legacyNumber,
      currency: input.currency?.trim() || "OMR",
      iban: input.iban?.trim() || undefined,
    }];
  }

  return [];
}

export function requireBankAccountNumbers(input: {
  accountNumber?: string;
  currency?: string;
  iban?: string;
  accounts?: BankAccountNumberInput[];
}): BankAccountNumberInput[] {
  const accounts = normalizeBankAccountNumbers(input);
  if (accounts.length === 0) {
    throw new Error("Add at least one account number.");
  }
  return accounts;
}

export function toLegacyBankAccountFields(accounts: BankAccountNumberInput[]) {
  const primary = accounts[0]!;
  return {
    accountNumber: primary.accountNumber,
    currency: primary.currency || "OMR",
    iban: primary.iban?.trim() || undefined,
  };
}

export function formatBankAccountNumbers(
  accounts: BankAccountNumberRecord[],
  fallback?: { accountNumber?: string | null; currency?: string | null },
): string {
  if (accounts.length > 0) {
    return accounts.map((row) => `${row.accountNumber} (${row.currency})`).join(", ");
  }

  if (fallback?.accountNumber) {
    return `${fallback.accountNumber} (${fallback.currency ?? "OMR"})`;
  }

  return "—";
}

export function accountNumbersFromLegacy(
  accountNumber: string,
  currency: string,
  accounts?: BankAccountNumberRecord[],
  parentIban?: string | null,
): BankAccountNumberInput[] {
  if (accounts && accounts.length > 0) {
    return accounts.map((row, index) => ({
      accountNumber: row.accountNumber,
      currency: row.currency,
      iban: row.iban ?? (index === 0 ? parentIban ?? undefined : undefined),
      label: row.label ?? undefined,
      includeInTransferLetterSource: row.includeInTransferLetterSource ?? false,
    }));
  }

  return [{
    accountNumber,
    currency,
    iban: parentIban ?? undefined,
    includeInTransferLetterSource: false,
  }];
}

export function resolveBankAccountNumberRows(
  accountNumbers: BankAccountNumberRecord[],
  fallback?: {
    accountNumber?: string | null;
    currency?: string | null;
    iban?: string | null;
    currentBalance?: { toString(): string } | number | null;
    balanceAsOf?: Date | null;
  },
): BankAccountNumberDisplay[] {
  if (accountNumbers.length > 0) {
    return accountNumbers.map((row, index) => ({
      id: row.id,
      accountNumber: row.accountNumber,
      currency: row.currency,
      label: row.label ?? null,
      iban: row.iban ?? (index === 0 ? fallback?.iban ?? null : null),
      includeInTransferLetterSource: row.includeInTransferLetterSource ?? false,
      currentBalance: toNumber(row.currentBalance),
      balanceAsOf: row.balanceAsOf ?? null,
      isStale: isStaleBalance(row.balanceAsOf),
    }));
  }

  if (fallback?.accountNumber) {
    return [{
      id: undefined,
      accountNumber: fallback.accountNumber,
      currency: fallback.currency ?? "OMR",
      label: null,
      iban: fallback.iban ?? null,
      includeInTransferLetterSource: false,
      currentBalance: toNumber(fallback.currentBalance),
      balanceAsOf: fallback.balanceAsOf ?? null,
      isStale: isStaleBalance(fallback.balanceAsOf),
    }];
  }

  return [];
}
