import type {
  BeneficiaryDesignationInput,
  FamilyEmailInput,
  FamilyPhoneInput,
  OwnershipStakeInput,
  SignatoryRoleInput,
} from "@/lib/family/types";

function parseJsonArray<T>(raw: string | null, label: string): T[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    throw new Error(`Invalid ${label} data.`);
  }
}

export function parseOwnershipStakesJson(raw: string | null): OwnershipStakeInput[] {
  return parseJsonArray<OwnershipStakeInput>(raw, "ownership stakes");
}

export function parseSignatoryRolesJson(raw: string | null): SignatoryRoleInput[] {
  return parseJsonArray<SignatoryRoleInput>(raw, "signatory roles");
}

export function parseBeneficiaryDesignationsJson(raw: string | null): BeneficiaryDesignationInput[] {
  return parseJsonArray<BeneficiaryDesignationInput>(raw, "beneficiary designations");
}

export function parseFamilyEmailsJson(raw: string | null): FamilyEmailInput[] {
  return parseJsonArray<FamilyEmailInput>(raw, "email addresses");
}

export function parseFamilyPhonesJson(raw: string | null): FamilyPhoneInput[] {
  return parseJsonArray<FamilyPhoneInput>(raw, "phone numbers");
}
