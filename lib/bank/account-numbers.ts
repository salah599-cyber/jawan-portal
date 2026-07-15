export type BankAccountNumberInput = {
  accountNumber: string;
  currency?: string;
  iban?: string;
  label?: string;
};

export type BankAccountNumberRecord = {
  accountNumber: string;
  currency: string;
  iban?: string | null;
  label?: string | null;
};

export type BankAccountNumberDisplay = {
  accountNumber: string;
  currency: string;
  label: string | null;
  iban: string | null;
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
    }));
  }

  return [{
    accountNumber,
    currency,
    iban: parentIban ?? undefined,
  }];
}

export function resolveBankAccountNumberRows(
  accountNumbers: BankAccountNumberRecord[],
  fallback?: {
    accountNumber?: string | null;
    currency?: string | null;
    iban?: string | null;
  },
): BankAccountNumberDisplay[] {
  if (accountNumbers.length > 0) {
    return accountNumbers.map((row, index) => ({
      accountNumber: row.accountNumber,
      currency: row.currency,
      label: row.label ?? null,
      iban: row.iban ?? (index === 0 ? fallback?.iban ?? null : null),
    }));
  }

  if (fallback?.accountNumber) {
    return [{
      accountNumber: fallback.accountNumber,
      currency: fallback.currency ?? "OMR",
      label: null,
      iban: fallback.iban ?? null,
    }];
  }

  return [];
}
