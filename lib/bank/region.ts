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
