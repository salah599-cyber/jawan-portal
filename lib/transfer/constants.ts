export const TRANSFER_CURRENCIES = [
  "OMR",
  "AED",
  "USD",
  "GBP",
  "EUR",
  "CHF",
  "SAR",
  "KWD",
  "BHD",
  "QAR",
] as const;

export const DEFAULT_BANK_DIVISIONS = [
  "Private Banking",
  "Retail Banking",
  "Corporate",
] as const;

export const CUSTOM_BANK_DIVISIONS_STORAGE_KEY = "transfer-letter-bank-divisions";

export function loadCustomBankDivisions(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_BANK_DIVISIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  } catch {
    return [];
  }
}

export function saveCustomBankDivisions(divisions: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CUSTOM_BANK_DIVISIONS_STORAGE_KEY, JSON.stringify(divisions));
}

export function mergeBankDivisions(custom: string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const division of [...DEFAULT_BANK_DIVISIONS, ...custom]) {
    const trimmed = division.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(trimmed);
  }

  return merged;
}
