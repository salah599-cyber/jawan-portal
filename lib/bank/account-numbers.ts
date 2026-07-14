export type BankAccountNumberInput = {
  accountNumber: string;
  currency?: string;
  label?: string;
};

export type BankAccountNumberRecord = {
  accountNumber: string;
  currency: string;
  label?: string | null;
};

export function normalizeBankAccountNumbers(input: {
  accountNumber?: string;
  currency?: string;
  accounts?: BankAccountNumberInput[];
}): BankAccountNumberInput[] {
  const fromAccounts = (input.accounts ?? [])
    .map((row) => ({
      accountNumber: row.accountNumber.trim(),
      currency: row.currency?.trim() || "OMR",
      label: row.label?.trim() || undefined,
    }))
    .filter((row) => row.accountNumber);

  if (fromAccounts.length > 0) return fromAccounts;

  const legacyNumber = input.accountNumber?.trim();
  if (legacyNumber) {
    return [{ accountNumber: legacyNumber, currency: input.currency?.trim() || "OMR" }];
  }

  return [];
}

export function requireBankAccountNumbers(input: {
  accountNumber?: string;
  currency?: string;
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
): BankAccountNumberInput[] {
  if (accounts && accounts.length > 0) {
    return accounts.map((row) => ({
      accountNumber: row.accountNumber,
      currency: row.currency,
      label: row.label ?? undefined,
    }));
  }

  return [{ accountNumber, currency }];
}
