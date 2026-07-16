import type { TransferLetter } from "@/lib/generated/prisma/client";
import { toDateInputValue } from "@/lib/transfer/format-letter-date";
import type { TransferLetterFormData } from "@/lib/transfer/types";

export function transferLetterToFormData(letter: TransferLetter): TransferLetterFormData {
  return {
    type: letter.type,
    letterDate: toDateInputValue(letter.letterDate),
    entityId: letter.entityId,
    sourceMode: letter.sourceBankAccountId ? "bank" : "manual",
    sourceBankAccountId: letter.sourceBankAccountId ?? "",
    sourceBankName: letter.sourceBankName,
    sourceBranch: letter.sourceBranch ?? "",
    sourceAccountNumber: letter.sourceAccountNumber,
    beneficiaryMode: letter.beneficiaryBankAccountId ? "bank" : "manual",
    beneficiaryBankAccountId: letter.beneficiaryBankAccountId ?? "",
    beneficiaryBankName: letter.beneficiaryBankName,
    beneficiaryName: letter.beneficiaryName,
    beneficiaryAccountNumber: letter.beneficiaryAccountNumber ?? "",
    beneficiaryIban: letter.beneficiaryIban ?? "",
    beneficiarySortCode: letter.beneficiarySortCode ?? "",
    beneficiarySwiftCode: letter.beneficiarySwiftCode ?? "",
    amount: letter.amount.toString(),
    currency: letter.currency,
    purpose: letter.purpose ?? "",
    mobileNo: letter.mobileNo ?? "",
    email: letter.email ?? "",
    specialInstructions: letter.specialInstructions ?? "",
    chargesOnBeneficiary: letter.chargesOnBeneficiary,
  };
}
