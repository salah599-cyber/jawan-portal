import type { TransferLetterType } from "@/lib/generated/prisma/client";

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const SCALES = ["", "Thousand", "Million", "Billion"];

export type ParsedAmount = {
  whole: number;
  fraction: number;
  fractionDenominator: 100 | 1000;
  maxDecimalPlaces: number;
};

export function getMaxDecimalPlaces(currency: string): number {
  return currency.toUpperCase() === "OMR" ? 3 : 2;
}

export function getFractionDenominator(currency: string): 100 | 1000 {
  return currency.toUpperCase() === "OMR" ? 1000 : 100;
}

export function parseAmountParts(amount: number | string, currency: string): ParsedAmount {
  const maxDecimalPlaces = getMaxDecimalPlaces(currency);
  const fractionDenominator = getFractionDenominator(currency);

  const raw =
    typeof amount === "string"
      ? amount.trim()
      : Number.isFinite(amount)
        ? amount.toString()
        : "";

  if (!raw) {
    return { whole: 0, fraction: 0, fractionDenominator, maxDecimalPlaces };
  }

  const normalized = raw.replace(/,/g, "");
  const match = normalized.match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) {
    const numeric = Number.parseFloat(normalized);
    if (!Number.isFinite(numeric) || numeric < 0) {
      return { whole: 0, fraction: 0, fractionDenominator, maxDecimalPlaces };
    }
    const whole = Math.floor(numeric);
    const fractionFloat = numeric - whole;
    const fraction = Math.round(fractionFloat * fractionDenominator);
    return { whole, fraction, fractionDenominator, maxDecimalPlaces };
  }

  const whole = Number.parseInt(match[1] ?? "0", 10);
  const fractionDigits = (match[2] ?? "").slice(0, maxDecimalPlaces);
  const fraction = fractionDigits
    ? Number.parseInt(fractionDigits.padEnd(maxDecimalPlaces, "0"), 10)
    : 0;

  return { whole, fraction, fractionDenominator, maxDecimalPlaces };
}

export function amountHasValue(amount: number | string, currency: string): boolean {
  const { whole, fraction } = parseAmountParts(amount, currency);
  return whole > 0 || fraction > 0;
}

function chunkToWords(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n]!;
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return ones ? `${TENS[tens]} ${ONES[ones]}` : TENS[tens]!;
  }
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  const hundredPart = `${ONES[hundreds]} Hundred`;
  return remainder ? `${hundredPart} ${chunkToWords(remainder)}` : hundredPart;
}

export function numberToEnglishWords(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "";
  if (value === 0) return "Zero";

  const whole = Math.floor(value);
  if (whole === 0) return "Zero";

  const parts: string[] = [];
  let remaining = whole;
  let scaleIndex = 0;

  while (remaining > 0) {
    const chunk = remaining % 1000;
    if (chunk > 0) {
      const chunkWords = chunkToWords(chunk);
      const scale = SCALES[scaleIndex];
      parts.unshift(scale ? `${chunkWords} ${scale}` : chunkWords);
    }
    remaining = Math.floor(remaining / 1000);
    scaleIndex += 1;
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function toSentenceCase(words: string): string {
  if (!words) return "";
  return words
    .split(" ")
    .map((word, index) => (index === 0 ? word : word.toLowerCase()))
    .join(" ");
}

function formatWordsWithFraction(whole: number, fraction: number, denominator: 100 | 1000): string {
  const wholeWords = toSentenceCase(numberToEnglishWords(whole));
  if (fraction === 0) return wholeWords;
  return `${wholeWords} & ${fraction}/${denominator}`;
}

export function formatAmountNumber(
  amount: number | string,
  currency: string,
  type: TransferLetterType,
): string {
  const { whole, fraction, maxDecimalPlaces } = parseAmountParts(amount, currency);

  if (fraction === 0) {
    if (type === "UK") {
      return `${currency} ${whole}`;
    }
    return `${currency} ${new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(whole)}`;
  }

  if (type === "UK") {
    const fractionFormatted = String(fraction).padStart(maxDecimalPlaces, "0");
    return `${currency} ${whole}.${fractionFormatted}`;
  }

  const wholeFormatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(whole);
  const fractionFormatted = String(fraction).padStart(maxDecimalPlaces, "0");

  return `${currency} ${wholeFormatted}.${fractionFormatted}`;
}

export function formatAmountWords(
  amount: number | string,
  currency: string,
  type: TransferLetterType,
): string {
  const { whole, fraction, fractionDenominator } = parseAmountParts(amount, currency);
  const hasFraction = fraction > 0;

  if (type === "UK") {
    const currencyLabel = currency.toUpperCase() === "GBP" ? "Pound Sterling" : currency;
    if (hasFraction) {
      return `${currencyLabel} ${formatWordsWithFraction(whole, fraction, fractionDenominator)}`;
    }
    return `${currencyLabel} ${numberToEnglishWords(whole)} Only`;
  }

  if (type === "INTERNATIONAL") {
    if (hasFraction) {
      return `${currency}: ${formatWordsWithFraction(whole, fraction, fractionDenominator)}`;
    }
    const lowerWords = numberToEnglishWords(whole)
      .replace(/\bThousand\b/g, "thousand")
      .replace(/\bMillion\b/g, "million");
    return `${currency}: ${lowerWords} Only`;
  }

  if (hasFraction) {
    return `${currency} ${formatWordsWithFraction(whole, fraction, fractionDenominator)}`;
  }

  return `${currency} ${numberToEnglishWords(whole)} Only`;
}

export function formatAmountLine(
  amount: number | string,
  currency: string,
  type: TransferLetterType,
): string {
  const numberPart = formatAmountNumber(amount, currency, type);
  const wordsPart = formatAmountWords(amount, currency, type);
  return `${numberPart} (${wordsPart})`;
}

export function buildAmountInWords(
  amount: number | string,
  currency: string,
  type: TransferLetterType,
): string {
  return formatAmountWords(amount, currency, type);
}

export function maskAccountNumber(accountNumber: string): string {
  const trimmed = accountNumber.trim();
  if (!trimmed) return "********************";
  return "*".repeat(Math.max(trimmed.length, 17));
}

export function defaultCurrencyForType(type: TransferLetterType): string {
  if (type === "UK") return "GBP";
  if (type === "INTERNATIONAL") return "AED";
  return "OMR";
}
