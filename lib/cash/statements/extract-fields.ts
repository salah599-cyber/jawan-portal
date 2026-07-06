import { CASH_CURRENCIES } from "@/lib/cash/constants";

const KNOWN_BANKS = [
  "Bank Muscat",
  "Bank Dhofar",
  "NBO",
  "National Bank of Oman",
  "HSBC",
  "Standard Chartered",
  "Ahli Bank",
  "Sohar International",
  "Oman Arab Bank",
  "Bank Nizwa",
];

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeAccountToken(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").replace(/[^\d.-]/g, "");
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? null : num;
}

export function extractIban(text: string): string | null {
  const match = text.match(/\b([A-Z]{2}\d{2}[A-Z0-9]{11,30})\b/);
  return match?.[1] ? normalizeAccountToken(match[1]) : null;
}

export function extractAccountNumber(text: string): string | null {
  const patterns = [
    /account\s*(?:no\.?|number|#)[:\s]*([A-Z0-9][A-Z0-9\-\/]{4,24})/i,
    /a\/c\s*(?:no\.?|number)[:\s]*([A-Z0-9][A-Z0-9\-\/]{4,24})/i,
    /(?:^|\n)\s*account[:\s]+([0-9]{6,20})/im,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return normalizeAccountToken(match[1]);
    }
  }

  const masked = text.match(/\*{2,}([0-9]{4,8})\b/);
  if (masked?.[1]) return masked[1];

  return null;
}

export function extractCurrency(text: string): string | null {
  const upper = text.toUpperCase();
  for (const currency of CASH_CURRENCIES) {
    if (new RegExp(`\\b${currency}\\b`).test(upper)) {
      return currency;
    }
  }

  const labeled = text.match(/currency[:\s]+([A-Z]{3})/i);
  if (labeled?.[1] && CASH_CURRENCIES.includes(labeled[1] as (typeof CASH_CURRENCIES)[number])) {
    return labeled[1].toUpperCase();
  }

  return null;
}

export function extractBalance(text: string, tableRows: unknown[][]): number | null {
  const linePatterns = [
    /closing\s+balance[:\s]+(?:[A-Z]{3}\s*)?([0-9,]+\.?\d*)/i,
    /available\s+balance[:\s]+(?:[A-Z]{3}\s*)?([0-9,]+\.?\d*)/i,
    /current\s+balance[:\s]+(?:[A-Z]{3}\s*)?([0-9,]+\.?\d*)/i,
    /balance\s+b\/f[:\s]+(?:[A-Z]{3}\s*)?([0-9,]+\.?\d*)/i,
    /total\s+balance[:\s]+(?:[A-Z]{3}\s*)?([0-9,]+\.?\d*)/i,
    /ledger\s+balance[:\s]+(?:[A-Z]{3}\s*)?([0-9,]+\.?\d*)/i,
  ];

  for (const pattern of linePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const amount = parseAmount(match[1]);
      if (amount != null) return amount;
    }
  }

  for (const row of tableRows) {
    const joined = row.map((cell) => String(cell ?? "")).join(" ");
    if (!/balance/i.test(joined)) continue;
    const amounts = joined.match(/[0-9,]+\.\d{2,3}/g);
    if (amounts?.length) {
      const amount = parseAmount(amounts[amounts.length - 1]!);
      if (amount != null) return amount;
    }
  }

  return null;
}

export function extractBalanceDate(text: string): Date | null {
  const patterns = [
    /statement\s+date[:\s]+([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/i,
    /as\s+at[:\s]+([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/i,
    /period\s+ending[:\s]+([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/i,
    /for\s+the\s+period[^\n]*?([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const parsed = parseFlexibleDate(match[1]);
      if (parsed) return parsed;
    }
  }

  return null;
}

function parseFlexibleDate(raw: string): Date | null {
  const parts = raw.split(/[\/\-.]/).map((part) => part.trim());
  if (parts.length !== 3) return null;

  let [a, b, c] = parts.map((part) => parseInt(part, 10));
  if ([a, b, c].some((n) => Number.isNaN(n))) return null;

  if (c < 100) c += 2000;

  // Prefer DD/MM/YYYY for regional statements; fall back when invalid.
  let day = a;
  let month = b;
  let year = c;
  let date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime()) || date.getUTCMonth() !== month - 1) {
    day = b;
    month = a;
    date = new Date(Date.UTC(year, month - 1, day));
  }

  return Number.isNaN(date.getTime()) ? null : date;
}

export function extractBankName(text: string, fileName: string): string | null {
  const haystack = `${fileName}\n${text}`.toLowerCase();
  for (const bank of KNOWN_BANKS) {
    if (haystack.includes(bank.toLowerCase())) {
      return bank;
    }
  }

  const headerMatch = text.match(/(?:^|\n)\s*([A-Z][A-Za-z\s&]{3,40}Bank[A-Za-z\s&]{0,30})/m);
  return headerMatch?.[1] ? normalizeSpaces(headerMatch[1]) : null;
}

export function extractAccountName(text: string): string | null {
  const patterns = [
    /account\s+name[:\s]+(.{2,80})/i,
    /customer\s+name[:\s]+(.{2,80})/i,
    /account\s+holder[:\s]+(.{2,80})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const value = normalizeSpaces(match[1].split("\n")[0] ?? "");
      if (value) return value;
    }
  }

  return null;
}

export function hasExtractableText(text: string) {
  return text.replace(/\s+/g, "").length >= 40;
}
