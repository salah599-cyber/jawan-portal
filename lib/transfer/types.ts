import type { TransferLetterType } from "@/lib/generated/prisma/client";
import { defaultCurrencyForType } from "@/lib/transfer/amount-in-words";

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
  beneficiaryRoutingNumber: string;
  correspondentBankName: string;
  correspondentSwiftCode: string;
  correspondentRoutingNumber: string;
  correspondentFfcInstructions: string;
  amount: string;
  currency: string;
  purpose: string;
  notes: string;
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
  routingNumber: string | null;
  correspondentBankName: string | null;
  correspondentSwiftCode: string | null;
  correspondentRoutingNumber: string | null;
  correspondentFfcInstructions: string | null;
  entityId: string | null;
  currency: string;
  notes: string | null;
  includeInTransferLetterSource: boolean;
  accountNumbers: {
    id: string;
    accountNumber: string;
    iban: string | null;
    currency: string;
    label: string | null;
    includeInTransferLetterSource: boolean;
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
  routingNumber: string | null;
  correspondentBankName: string | null;
  correspondentSwiftCode: string | null;
  correspondentRoutingNumber: string | null;
  correspondentFfcInstructions: string | null;
  notes: string | null;
  entityId: string | null;
  label: string | null;
  includeInTransferLetterSource: boolean;
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
    beneficiaryRoutingNumber: overrides.beneficiaryRoutingNumber ?? "",
    correspondentBankName: overrides.correspondentBankName ?? "",
    correspondentSwiftCode: overrides.correspondentSwiftCode ?? "",
    correspondentRoutingNumber: overrides.correspondentRoutingNumber ?? "",
    correspondentFfcInstructions: overrides.correspondentFfcInstructions ?? "",
    amount: overrides.amount ?? "",
    currency: overrides.currency ?? defaultCurrencyForType(type),
    purpose: overrides.purpose ?? "",
    notes: overrides.notes ?? "",
    mobileNo: overrides.mobileNo ?? "",
    email: overrides.email ?? "",
    specialInstructions: overrides.specialInstructions ?? "",
    chargesOnBeneficiary: overrides.chargesOnBeneficiary ?? type === "UK",
  };
}
