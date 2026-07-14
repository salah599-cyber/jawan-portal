import type { ContactEmailInput, ContactPhoneInput } from "@/lib/contacts/types";

function parseJsonArray<T>(raw: string | null, label: string): T[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    throw new Error(`Invalid ${label} data.`);
  }
}

export function parseContactEmailsJson(raw: string | null): ContactEmailInput[] {
  return parseJsonArray<ContactEmailInput>(raw, "email addresses");
}

export function parseContactPhonesJson(raw: string | null): ContactPhoneInput[] {
  return parseJsonArray<ContactPhoneInput>(raw, "phone numbers");
}
