import type { TransferLetterBankOption } from "@/lib/transfer/types";

export function bankAccountToBeneficiaryFields(account: TransferLetterBankOption) {
  const primaryNumber = account.accountNumbers[0];

  return {
    beneficiaryBankName: account.bankName,
    beneficiaryName: account.accountName,
    beneficiaryAccountNumber: primaryNumber?.accountNumber ?? account.accountNumber,
    beneficiaryIban: primaryNumber?.iban ?? account.iban ?? "",
    beneficiarySortCode: account.sortCode ?? "",
    beneficiarySwiftCode: account.swiftCode ?? "",
  };
}

export function bankAccountToSourceFields(account: TransferLetterBankOption) {
  const primaryNumber = account.accountNumbers[0];

  return {
    sourceBankName: account.bankName,
    sourceBranch: account.notes ?? "",
    sourceAccountNumber: primaryNumber?.accountNumber ?? account.accountNumber,
    currency: primaryNumber?.currency ?? account.currency,
  };
}
