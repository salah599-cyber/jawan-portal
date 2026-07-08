import {
  extractAccountName,
  extractAccountNumber,
  extractBalance,
  extractBalanceDate,
  extractCurrency,
  extractIban,
  parseAmount,
} from "@/lib/cash/statements/extract-fields";
import {
  assertExtractableText,
  finalizeParsed,
  type ExtractedPdf,
} from "@/lib/cash/statements/parsers/common";
import type { ParsedBankStatement } from "@/lib/cash/statements/types";

const PARSER_ID = "bank-muscat";

function extractBankMuscatAccountNumber(text: string): string | null {
  const patterns = [
    /a\/c\s*no\.?\s*[:\s]*([0-9]{8,16})/i,
    /account\s+no\.?\s*[:\s]*([0-9]{8,16})/i,
    /account\s+number[:\s]*([0-9]{8,16})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].replace(/\s+/g, "");
  }

  return null;
}

function extractBankMuscatBalance(text: string, tableRows: unknown[][]): number | null {
  const patterns = [
    /closing\s+balance\s*(?:\(?(?:OMR|USD|EUR|GBP|AED)\)?)?[:\s]+([0-9,]+\.?\d*)/i,
    /available\s+balance\s*(?:\(?(?:OMR|USD|EUR|GBP|AED)\)?)?[:\s]+([0-9,]+\.?\d*)/i,
    /ledger\s+balance[:\s]+([0-9,]+\.?\d*)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const amount = parseAmount(match[1]);
      if (amount != null) return amount;
    }
  }

  return extractBalance(text, tableRows);
}

function extractBankMuscatBalanceDate(text: string): Date | null {
  const patterns = [
    /statement\s+period[:\s]+[0-9/.\-\s]+to\s+([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/i,
    /as\s+at[:\s]+([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const date = extractBalanceDate(`statement date: ${match[1]}`);
      if (date) return date;
    }
  }

  return extractBalanceDate(text);
}

export function parseBankMuscatStatement(content: ExtractedPdf, _fileName: string): ParsedBankStatement {
  const blocked = assertExtractableText(PARSER_ID, content);
  if (blocked) return blocked;

  const { text, tableRows } = content;
  const warnings: string[] = [];
  const accountNumber = extractBankMuscatAccountNumber(text) ?? extractAccountNumber(text);
  const iban = extractIban(text);
  const currency = extractCurrency(text) ?? "OMR";
  const balance = extractBankMuscatBalance(text, tableRows);
  const balanceDate = extractBankMuscatBalanceDate(text) ?? new Date();
  const accountName = extractAccountName(text);

  if (!balance) warnings.push("Closing balance not detected — enter it manually before applying.");
  if (!accountNumber && !iban) {
    warnings.push("Account number and IBAN not detected — select the account manually before applying.");
  }
  if (!extractBankMuscatBalanceDate(text) && !extractBalanceDate(text)) {
    warnings.push("Statement date not detected — today's date is pre-filled. Adjust if needed.");
  }

  return finalizeParsed(
    PARSER_ID,
    {
      bankName: "Bank Muscat",
      accountName,
      accountNumber,
      iban,
      currency,
      balance,
      balanceDate,
    },
    warnings,
  );
}
