import type { TransferLetterType } from "@/lib/generated/prisma/client";

export type TransferLetterFormData = {
  type: TransferLetterType;
  letterDate: string;
  entityId: string;
  sourceMode: "bank" | "manual";
  sourceBankAccountId: string;
  sourcePickId: string;
  sourceBankName: string;
  sourceBranch: string;
  sourceAccountNumber: string;
  beneficiaryMode: "bank" | "manual";
  beneficiaryBankAccountId: string;
  beneficiaryPickId: string;
  beneficiaryBankName: string;
  beneficiaryName: string;
  beneficiaryAccountNumber: string;
  beneficiaryIban: string;
  beneficiarySortCode: string;
  beneficiarySwiftCode: string;
  amount: string;
  currency: string;
  purpose: string;
  mobileNo: string;
  email: string;
  specialInstructions: string;
  chargesOnBeneficiary: boolean;
};

export type TransferLetterBankOption = {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  iban: string | null;
  sortCode: string | null;
  swiftCode: string | null;
  entityId: string | null;
  currency: string;
  notes: string | null;
  accountNumbers: {
    id: string;
    accountNumber: string;
    iban: string | null;
    currency: string;
    label: string | null;
  }[];
};

export type TransferLetterAccountPickOption = {
  pickId: string;
  bankAccountId: string;
  bankAccountNumberId: string | null;
  accountName: string;
  bankName: string;
  accountNumber: string;
  currency: string;
  iban: string | null;
  sortCode: string | null;
  swiftCode: string | null;
  notes: string | null;
  entityId: string | null;
  label: string | null;
};

export function emptyTransferLetterForm(
  overrides: Partial<TransferLetterFormData> = {},
): TransferLetterFormData {
  const type = overrides.type ?? "LOCAL";
  return {
    type,
    letterDate: overrides.letterDate ?? new Date().toISOString().slice(0, 10),
    entityId: overrides.entityId ?? "",
    sourceMode: overrides.sourceMode ?? "bank",
    sourceBankAccountId: overrides.sourceBankAccountId ?? "",
    sourcePickId: overrides.sourcePickId ?? "",
    sourceBankName: overrides.sourceBankName ?? "",
    sourceBranch: overrides.sourceBranch ?? "",
    sourceAccountNumber: overrides.sourceAccountNumber ?? "",
    beneficiaryMode: overrides.beneficiaryMode ?? "manual",
    beneficiaryBankAccountId: overrides.beneficiaryBankAccountId ?? "",
    beneficiaryPickId: overrides.beneficiaryPickId ?? "",
    beneficiaryBankName: overrides.beneficiaryBankName ?? "",
    beneficiaryName: overrides.beneficiaryName ?? "",
    beneficiaryAccountNumber: overrides.beneficiaryAccountNumber ?? "",
    beneficiaryIban: overrides.beneficiaryIban ?? "",
    beneficiarySortCode: overrides.beneficiarySortCode ?? "",
    beneficiarySwiftCode: overrides.beneficiarySwiftCode ?? "",
    amount: overrides.amount ?? "",
    currency: overrides.currency ?? "OMR",
    purpose: overrides.purpose ?? "",
    mobileNo: overrides.mobileNo ?? "",
    email: overrides.email ?? "",
    specialInstructions: overrides.specialInstructions ?? "",
    chargesOnBeneficiary: overrides.chargesOnBeneficiary ?? type === "UK",
  };
}
