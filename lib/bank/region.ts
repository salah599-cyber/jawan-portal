import type { BankAccountRegion } from "@/lib/generated/prisma/client";

export const BANK_ACCOUNT_REGIONS = ["OMAN", "USA"] as const satisfies readonly BankAccountRegion[];

export function parseBankAccountRegion(value: string | null | undefined): BankAccountRegion {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "USA") return "USA";
  return "OMAN";
}

export function isUsaBankRegion(region: BankAccountRegion) {
  return region === "USA";
}

export function defaultCurrencyForRegion(region: BankAccountRegion) {
  return region === "USA" ? "USD" : "OMR";
}

export function validateBankAccountRegionFields(
  region: BankAccountRegion,
  routingNumber?: string | null,
) {
  if (!isUsaBankRegion(region)) return;

  const digits = routingNumber?.replace(/\D/g, "") ?? "";
  if (digits.length !== 9) {
    throw new Error("USA bank accounts require a 9-digit ABA routing number.");
  }
}

export function normalizeRoutingNumber(routingNumber?: string | null) {
  const digits = routingNumber?.replace(/\D/g, "") ?? "";
  return digits || undefined;
}

export type CorrespondentBankInput = {
  correspondentBankName?: string | null;
  correspondentSwiftCode?: string | null;
  correspondentRoutingNumber?: string | null;
  correspondentFfcInstructions?: string | null;
};

export function validateCorrespondentRoutingNumber(routingNumber?: string | null) {
  const digits = routingNumber?.replace(/\D/g, "") ?? "";
  if (!digits) return;
  if (digits.length !== 9) {
    throw new Error("Correspondent routing number must be 9 digits when provided.");
  }
}

export function normalizeCorrespondentBankFields(input: CorrespondentBankInput) {
  const correspondentRoutingNumber = normalizeRoutingNumber(input.correspondentRoutingNumber);
  validateCorrespondentRoutingNumber(correspondentRoutingNumber);

  return {
    correspondentBankName: input.correspondentBankName?.trim() || null,
    correspondentSwiftCode: input.correspondentSwiftCode?.trim() || null,
    correspondentRoutingNumber: correspondentRoutingNumber ?? null,
    correspondentFfcInstructions: input.correspondentFfcInstructions?.trim() || null,
  };
}

export function emptyCorrespondentBankFields() {
  return {
    correspondentBankName: null,
    correspondentSwiftCode: null,
    correspondentRoutingNumber: null,
    correspondentFfcInstructions: null,
  };
}
