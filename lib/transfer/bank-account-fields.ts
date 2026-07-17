import type { TransferLetterAccountPickOption, TransferLetterBankOption } from "@/lib/transfer/types";

export function flattenBankAccountPickOptions(
  accounts: TransferLetterBankOption[],
): TransferLetterAccountPickOption[] {
  const options: TransferLetterAccountPickOption[] = [];

  for (const account of accounts) {
    if (account.accountNumbers.length > 0) {
      for (const row of account.accountNumbers) {
        options.push({
          pickId: row.id,
          bankAccountId: account.id,
          bankAccountNumberId: row.id,
          accountName: account.accountName,
          bankName: account.bankName,
          accountNumber: row.accountNumber,
          currency: row.currency,
          iban: row.iban ?? account.iban,
          sortCode: account.sortCode,
          swiftCode: account.swiftCode,
          notes: account.notes,
          entityId: account.entityId,
          label: row.label,
          includeInTransferLetterSource: row.includeInTransferLetterSource ?? account.includeInTransferLetterSource,
        });
      }
      continue;
    }

    options.push({
      pickId: `${account.id}:legacy`,
      bankAccountId: account.id,
      bankAccountNumberId: null,
      accountName: account.accountName,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      currency: account.currency,
      iban: account.iban,
      sortCode: account.sortCode,
      swiftCode: account.swiftCode,
      notes: account.notes,
      entityId: account.entityId,
      label: null,
      includeInTransferLetterSource: account.includeInTransferLetterSource,
    });
  }

  return options;
}

export function formatBankAccountPickLabel(option: TransferLetterAccountPickOption): string {
  const labelSuffix = option.label ? ` · ${option.label}` : "";
  return `${option.bankName} — ${option.accountName}${labelSuffix} (${option.accountNumber}, ${option.currency})`;
}

export function findBankAccountPickOption(
  options: TransferLetterAccountPickOption[],
  input: {
    bankAccountId?: string | null;
    accountNumber?: string | null;
    pickId?: string | null;
  },
): TransferLetterAccountPickOption | undefined {
  if (input.pickId) {
    return options.find((option) => option.pickId === input.pickId);
  }

  if (!input.bankAccountId) return undefined;

  const matches = options.filter((option) => option.bankAccountId === input.bankAccountId);
  if (matches.length === 0) return undefined;

  if (input.accountNumber) {
    return (
      matches.find((option) => option.accountNumber === input.accountNumber) ??
      matches[0]
    );
  }

  return matches[0];
}

export function bankAccountPickToBeneficiaryFields(option: TransferLetterAccountPickOption) {
  return {
    beneficiaryBankName: option.bankName,
    beneficiaryName: option.accountName,
    beneficiaryAccountNumber: option.accountNumber,
    beneficiaryIban: option.iban ?? "",
    beneficiarySortCode: option.sortCode ?? "",
    beneficiarySwiftCode: option.swiftCode ?? "",
  };
}

export function bankAccountPickToSourceFields(option: TransferLetterAccountPickOption) {
  return {
    sourceBankName: option.bankName,
    sourceBranch: option.notes ?? "",
    sourceAccountNumber: option.accountNumber,
    currency: option.currency,
  };
}
