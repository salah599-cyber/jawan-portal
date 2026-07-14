import {
  DEFAULT_PHONE_COUNTRY_CODE,
  PHONE_COUNTRY_CODES,
} from "@/lib/contacts/phone-country-codes";
import type { ContactPhoneInput } from "@/lib/contacts/types";

export function formatPhoneDisplay(countryCode: string, phone: string): string {
  const code = countryCode.trim() || DEFAULT_PHONE_COUNTRY_CODE;
  const number = phone.trim();
  if (!number) return "";
  return `${code} ${number}`;
}

export function formatPhoneE164(countryCode: string, phone: string): string {
  const code = countryCode.trim() || DEFAULT_PHONE_COUNTRY_CODE;
  const number = phone.trim().replace(/\s+/g, "");
  if (!number) return "";
  return `${code}${number}`;
}

export function parseLegacyPhone(full: string | null | undefined): Pick<ContactPhoneInput, "countryCode" | "phone"> {
  const trimmed = full?.trim() ?? "";
  if (!trimmed) {
    return { countryCode: DEFAULT_PHONE_COUNTRY_CODE, phone: "" };
  }

  const sortedCodes = [...PHONE_COUNTRY_CODES].sort(
    (a, b) => b.dialCode.length - a.dialCode.length,
  );

  for (const option of sortedCodes) {
    if (trimmed.startsWith(option.dialCode)) {
      return {
        countryCode: option.dialCode,
        phone: trimmed.slice(option.dialCode.length).trim(),
      };
    }
  }

  return { countryCode: DEFAULT_PHONE_COUNTRY_CODE, phone: trimmed };
}

export function phonesToLegacyFields(phones: ContactPhoneInput[]) {
  const valid = phones
    .map((row) => ({
      countryCode: row.countryCode?.trim() || DEFAULT_PHONE_COUNTRY_CODE,
      phone: row.phone.trim(),
      label: row.label?.trim() || null,
    }))
    .filter((row) => row.phone);

  return {
    phonePrimary: valid[0] ? formatPhoneE164(valid[0].countryCode, valid[0].phone) : null,
    phoneSecondary: valid[1] ? formatPhoneE164(valid[1].countryCode, valid[1].phone) : null,
  };
}
