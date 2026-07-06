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

const MONTH_NAMES: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const BALANCE_LABEL =
  /(?:closing|available|current|ledger|total|ending|book|cleared|final)\s*balance|balance\s*(?:b\/f|b\/c|brought\s*forward|carried\s*forward)/i;

const ACCOUNT_LABEL =
  /(?:account|a\/c|acct|acc)(?:\s*(?:no|number|#|num))?\.?/i;

const IBAN_COUNTRY_LENGTHS: Record<string, number> = {
  AD: 24,
  AE: 23,
  AL: 28,
  AT: 20,
  AZ: 28,
  BA: 20,
  BE: 16,
  BG: 22,
  BH: 22,
  BR: 29,
  CH: 21,
  CR: 22,
  CY: 28,
  CZ: 24,
  DE: 22,
  DK: 18,
  DO: 28,
  EE: 20,
  ES: 24,
  FI: 18,
  FO: 18,
  FR: 27,
  GB: 22,
  GE: 22,
  GI: 23,
  GL: 18,
  GR: 27,
  GT: 28,
  HR: 21,
  HU: 28,
  IE: 22,
  IL: 23,
  IS: 26,
  IT: 27,
  JO: 30,
  KW: 30,
  KZ: 20,
  LB: 28,
  LC: 32,
  LI: 21,
  LT: 20,
  LU: 20,
  LV: 21,
  MC: 27,
  MD: 24,
  ME: 22,
  MK: 19,
  MR: 27,
  MT: 31,
  MU: 30,
  NL: 18,
  NO: 15,
  OM: 23,
  PK: 24,
  PL: 28,
  PS: 29,
  PT: 25,
  QA: 29,
  RO: 24,
  RS: 22,
  SA: 24,
  SE: 24,
  SI: 19,
  SK: 24,
  SM: 27,
  TN: 24,
  TR: 26,
  UA: 29,
  VG: 24,
  XK: 20,
};

function isValidIbanChecksum(iban: string): boolean {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));
  let remainder = 0;
  for (const ch of numeric) {
    remainder = (remainder * 10 + parseInt(ch, 10)) % 97;
  }
  return remainder === 1;
}

function isPlausibleIban(value: string): boolean {
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(value)) return false;

  const country = value.slice(0, 2);
  const expectedLength = IBAN_COUNTRY_LENGTHS[country];
  if (expectedLength && value.length !== expectedLength) return false;
  if (!expectedLength && (value.length < 15 || value.length > 34)) return false;

  return isValidIbanChecksum(value);
}

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeAccountToken(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

/** Normalize PDF text artifacts while keeping line boundaries for multiline parsing. */
export function prepareStatementText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").replace(/[^\d.-]/g, "");
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? null : num;
}

function parseNumericDate(day: number, month: number, year: number): Date | null {
  if (year < 100) year += 2000;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime()) || date.getUTCMonth() !== month - 1) return null;
  return date;
}

function parseFlexibleDate(raw: string): Date | null {
  const trimmed = raw.trim();

  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return parseNumericDate(parseInt(iso[3]!, 10), parseInt(iso[2]!, 10), parseInt(iso[1]!, 10));
  }

  const monthName = trimmed.match(/^(\d{1,2})[\s\-/]([A-Za-z]{3,9})[\s\-/](\d{2,4})$/);
  if (monthName) {
    const month = MONTH_NAMES[monthName[2]!.toLowerCase()];
    if (month) {
      return parseNumericDate(parseInt(monthName[1]!, 10), month, parseInt(monthName[3]!, 10));
    }
  }

  const monthNameFirst = trimmed.match(/^([A-Za-z]{3,9})[\s\-/](\d{1,2})[\s\-/,](\d{2,4})$/);
  if (monthNameFirst) {
    const month = MONTH_NAMES[monthNameFirst[1]!.toLowerCase()];
    if (month) {
      return parseNumericDate(parseInt(monthNameFirst[2]!, 10), month, parseInt(monthNameFirst[3]!, 10));
    }
  }

  const parts = trimmed.split(/[\/\-.]/).map((part) => part.trim());
  if (parts.length !== 3) return null;

  let [a, b, c] = parts.map((part) => parseInt(part, 10));
  if ([a, b, c].some((n) => Number.isNaN(n))) return null;

  let day = a;
  let month = b;
  let year = c;
  let date = parseNumericDate(day, month, year);
  if (!date) {
    day = b;
    month = a;
    date = parseNumericDate(day, month, year);
  }

  return date;
}

function findAmountInText(fragment: string): number | null {
  const patterns = [
    /(?:OMR|USD|EUR|GBP|AED|HKD|INR)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2,3})?)\s*(?:CR|DR)?/i,
    /([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2,3})?)\s*(?:OMR|USD|EUR|GBP|AED|HKD|INR)\s*(?:CR|DR)?/i,
    /([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2,3})?)\s*(?:CR|DR)\b/i,
    /([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2,3})?)/,
  ];

  for (const pattern of patterns) {
    const match = fragment.match(pattern);
    if (match?.[1]) {
      const amount = parseAmount(match[1]);
      if (amount != null && amount >= 0) return amount;
    }
  }

  return null;
}

function extractValueNearLabel(text: string, label: RegExp, maxChars = 180): string | null {
  const flags = label.flags.includes("g") ? label.flags : `${label.flags}g`;
  const matcher = new RegExp(label.source, flags);

  for (const match of text.matchAll(matcher)) {
    const slice = text.slice(match.index ?? 0, (match.index ?? 0) + maxChars);
    const afterLabel = slice.slice(match[0].length);
    const lineBreak = afterLabel.indexOf("\n");
    const firstLine = lineBreak >= 0 ? afterLabel.slice(0, lineBreak) : afterLabel;
    const candidate = normalizeSpaces(firstLine.replace(/^[\s:.-]+/, ""));
    if (candidate) return candidate;
  }

  return null;
}

export function extractIban(text: string): string | null {
  const prepared = prepareStatementText(text);
  const candidates: string[] = [];

  for (const match of prepared.matchAll(/\b([A-Z]{2}\s*\d{2}(?:\s*[A-Z0-9]{4}){2,8})\b/gi)) {
    const compact = normalizeAccountToken(match[1]!);
    if (isPlausibleIban(compact)) candidates.push(compact);
  }

  const compactText = prepared.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  for (const country of Object.keys(IBAN_COUNTRY_LENGTHS)) {
    const length = IBAN_COUNTRY_LENGTHS[country]!;
    const regex = new RegExp(`${country}\\d{2}[A-Z0-9]{${length - 4}}`, "g");
    for (const match of compactText.matchAll(regex)) {
      const candidate = match[0]!;
      if (isPlausibleIban(candidate)) candidates.push(candidate);
    }
  }

  const unique = [...new Set(candidates)];
  const omani = unique.find((value) => value.startsWith("OM"));
  if (omani) return omani;

  return unique[0] ?? null;
}

export function extractAccountNumber(text: string): string | null {
  const prepared = prepareStatementText(text);

  const inlinePatterns = [
    /account\s*(?:no\.?|number|#|num\.?)[:\s]*([A-Z0-9][A-Z0-9\-\/]{4,24})/i,
    /a\/c\s*(?:no\.?|number)[:\s]*([A-Z0-9][A-Z0-9\-\/]{4,24})/i,
    /acct\.?\s*(?:no\.?|number)?[:\s]*([A-Z0-9][A-Z0-9\-\/]{4,24})/i,
    /acc(?:ount)?\s*#[:\s]*([A-Z0-9][A-Z0-9\-\/]{4,24})/i,
    /(?:^|\n)\s*account[:\s]+([0-9]{6,20})/im,
    /customer\s*(?:id|no\.?|number)[:\s]*([A-Z0-9][A-Z0-9\-\/]{4,20})/i,
  ];

  for (const pattern of inlinePatterns) {
    const match = prepared.match(pattern);
    if (match?.[1]) {
      return normalizeAccountToken(match[1]);
    }
  }

  const nearLabel = extractValueNearLabel(prepared, ACCOUNT_LABEL);
  if (nearLabel) {
    const digits = nearLabel.match(/\b([0-9]{6,20})\b/);
    if (digits?.[1]) return digits[1];
    const token = nearLabel.match(/\b([A-Z0-9][A-Z0-9\-\/]{4,24})\b/i);
    if (token?.[1]) return normalizeAccountToken(token[1]);
  }

  const lines = prepared.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (!ACCOUNT_LABEL.test(line)) continue;

    const sameLine = line.match(/(?:no\.?|number|#|num\.?)?[:\s]+([0-9]{6,20})/i);
    if (sameLine?.[1]) return sameLine[1];

    for (let j = 1; j <= 2 && i + j < lines.length; j++) {
      const next = (lines[i + j] ?? "").trim();
      if (!next || BALANCE_LABEL.test(next)) break;
      const digits = next.match(/^([0-9]{6,20})$/);
      if (digits?.[1]) return digits[1];
    }
  }

  const masked = prepared.match(/\*{2,}([0-9]{4,12})\b/);
  if (masked?.[1]) return masked[1];

  const iban = extractIban(prepared);
  if (iban?.startsWith("OM") && iban.length >= 21) {
    return iban.slice(-12).replace(/^0+/, "") || iban.slice(-12);
  }

  return null;
}

export function extractCurrency(text: string): string | null {
  const upper = prepareStatementText(text).toUpperCase();
  for (const currency of CASH_CURRENCIES) {
    if (new RegExp(`\\b${currency}\\b`).test(upper)) {
      return currency;
    }
  }

  const labeled = upper.match(/CURRENCY[:\s]+([A-Z]{3})/);
  if (labeled?.[1] && CASH_CURRENCIES.includes(labeled[1] as (typeof CASH_CURRENCIES)[number])) {
    return labeled[1];
  }

  return null;
}

function extractBalanceNearLabels(text: string): number | null {
  const prepared = prepareStatementText(text);
  const matcher = new RegExp(BALANCE_LABEL.source, "gi");

  for (const match of prepared.matchAll(matcher)) {
    const slice = prepared.slice(match.index ?? 0, (match.index ?? 0) + 220);
    const amount = findAmountInText(slice.slice(match[0].length));
    if (amount != null) return amount;

    const lineStart = prepared.lastIndexOf("\n", match.index ?? 0);
    const lineEnd = prepared.indexOf("\n", (match.index ?? 0) + match[0].length);
    const block = prepared.slice(
      lineStart >= 0 ? lineStart : 0,
      lineEnd >= 0 ? lineEnd : prepared.length,
    );
    const blockAmount = findAmountInText(block);
    if (blockAmount != null) return blockAmount;
  }

  const lines = prepared.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!BALANCE_LABEL.test(lines[i] ?? "")) continue;

    const sameLineAmount = findAmountInText(lines[i] ?? "");
    if (sameLineAmount != null) return sameLineAmount;

    for (let j = 1; j <= 3 && i + j < lines.length; j++) {
      const next = (lines[i + j] ?? "").trim();
      if (!next || ACCOUNT_LABEL.test(next)) break;
      const amount = findAmountInText(next);
      if (amount != null) return amount;
    }
  }

  return null;
}

function extractBalanceFromTables(tableRows: unknown[][]): number | null {
  let best: number | null = null;

  for (const row of tableRows) {
    const joined = row.map((cell) => String(cell ?? "")).join(" ");
    if (!BALANCE_LABEL.test(joined)) continue;
    const amount = findAmountInText(joined);
    if (amount != null) best = amount;
  }

  if (best != null) return best;

  for (const row of tableRows) {
    const joined = row.map((cell) => String(cell ?? "")).join(" ");
    if (!/balance/i.test(joined)) continue;
    const amounts = joined.match(/[0-9,]+\.\d{2,3}/g);
    if (amounts?.length) {
      const amount = parseAmount(amounts[amounts.length - 1]!);
      if (amount != null) best = amount;
    }
  }

  return best;
}

export function extractBalance(text: string, tableRows: unknown[][]): number | null {
  const prepared = prepareStatementText(text);

  const linePatterns = [
    /closing\s+balance[\s:]*(?:\(?[A-Z]{3}\)?)?[\s:]*([0-9,]+\.?\d*)/i,
    /available\s+balance[\s:]*(?:\(?[A-Z]{3}\)?)?[\s:]*([0-9,]+\.?\d*)/i,
    /current\s+balance[\s:]*(?:\(?[A-Z]{3}\)?)?[\s:]*([0-9,]+\.?\d*)/i,
    /balance\s+b\/f[\s:]*(?:\(?[A-Z]{3}\)?)?[\s:]*([0-9,]+\.?\d*)/i,
    /total\s+balance[\s:]*(?:\(?[A-Z]{3}\)?)?[\s:]*([0-9,]+\.?\d*)/i,
    /ledger\s+balance[\s:]*(?:\(?[A-Z]{3}\)?)?[\s:]*([0-9,]+\.?\d*)/i,
    /ending\s+balance[\s:]*(?:\(?[A-Z]{3}\)?)?[\s:]*([0-9,]+\.?\d*)/i,
  ];

  for (const pattern of linePatterns) {
    const match = prepared.match(pattern);
    if (match?.[1]) {
      const amount = parseAmount(match[1]);
      if (amount != null) return amount;
    }
  }

  const nearLabel = extractBalanceNearLabels(prepared);
  if (nearLabel != null) return nearLabel;

  const fromTables = extractBalanceFromTables(tableRows);
  if (fromTables != null) return fromTables;

  return null;
}

export function extractBalanceDate(text: string): Date | null {
  const prepared = prepareStatementText(text);

  const patterns = [
    /statement\s+date[:\s]+([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/i,
    /statement\s+date[:\s]+(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})/i,
    /as\s+(?:at|on)[:\s]+([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/i,
    /as\s+(?:at|on)[:\s]+(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})/i,
    /period\s+end(?:ing)?[:\s]+([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/i,
    /(?:to|until|ending)[:\s]+([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/i,
    /for\s+the\s+period[^\n]*?\bto\b[^\n]*?([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/i,
    /statement\s+period[:\s]+[0-9/.\-\s]+?\bto\b[:\s]+([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/i,
    /generated\s+on[:\s]+([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/i,
    /print(?:ed)?\s+date[:\s]+([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/i,
    /(\d{4}-\d{2}-\d{2})/,
  ];

  for (const pattern of patterns) {
    const match = prepared.match(pattern);
    if (match?.[1]) {
      const parsed = parseFlexibleDate(match[1]);
      if (parsed) return parsed;
    }
  }

  const lines = prepared.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (!/statement\s+date|as\s+at|period\s+end/i.test(line)) continue;

    const sameLine = line.match(/([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})/);
    if (sameLine?.[1]) {
      const parsed = parseFlexibleDate(sameLine[1]);
      if (parsed) return parsed;
    }

    for (let j = 1; j <= 2 && i + j < lines.length; j++) {
      const next = (lines[i + j] ?? "").trim();
      const parsed = parseFlexibleDate(next);
      if (parsed) return parsed;
    }
  }

  return null;
}

export function extractBankName(text: string, fileName: string): string | null {
  const haystack = `${fileName}\n${prepareStatementText(text)}`.toLowerCase();
  for (const bank of KNOWN_BANKS) {
    if (haystack.includes(bank.toLowerCase())) {
      return bank;
    }
  }

  const headerMatch = text.match(/(?:^|\n)\s*([A-Z][A-Za-z\s&]{3,40}Bank[A-Za-z\s&]{0,30})/m);
  return headerMatch?.[1] ? normalizeSpaces(headerMatch[1]) : null;
}

export function extractAccountName(text: string): string | null {
  const prepared = prepareStatementText(text);
  const patterns = [
    /account\s+name[:\s]+(.{2,80})/i,
    /customer\s+name[:\s]+(.{2,80})/i,
    /account\s+holder[:\s]+(.{2,80})/i,
    /name\s+of\s+account\s+holder[:\s]+(.{2,80})/i,
  ];

  for (const pattern of patterns) {
    const match = prepared.match(pattern);
    if (match?.[1]) {
      const value = normalizeSpaces(match[1].split("\n")[0] ?? "");
      if (value) return value;
    }
  }

  const nearLabel = extractValueNearLabel(prepared, /customer\s+name/i);
  if (nearLabel && nearLabel.length >= 2) return nearLabel.split("\n")[0] ?? nearLabel;

  return null;
}

export function hasExtractableText(text: string) {
  return prepareStatementText(text).replace(/\s+/g, "").length >= 40;
}
