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

export function formatAmountNumber(amount: number, currency: string, type: TransferLetterType): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  if (type === "UK") {
    return `${currency} ${Math.round(safeAmount)}`;
  }
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(safeAmount));
  return `${currency} ${formatted}`;
}

export function formatAmountWords(amount: number, currency: string, type: TransferLetterType): string {
  const safeAmount = Number.isFinite(amount) ? Math.round(amount) : 0;
  const words = numberToEnglishWords(safeAmount);

  if (type === "UK") {
    const currencyLabel = currency === "GBP" ? "Pound Sterling" : currency;
    return `${currencyLabel} ${words} Only`;
  }

  if (type === "INTERNATIONAL") {
    const lowerWords = words.replace(/\bThousand\b/g, "thousand").replace(/\bMillion\b/g, "million");
    return `${currency}: ${lowerWords} Only`;
  }

  return `${currency} ${words} Only`;
}

export function formatAmountLine(amount: number, currency: string, type: TransferLetterType): string {
  const numberPart = formatAmountNumber(amount, currency, type);
  const wordsPart = formatAmountWords(amount, currency, type);
  return `${numberPart} (${wordsPart})`;
}

export function buildAmountInWords(amount: number, currency: string, type: TransferLetterType): string {
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
