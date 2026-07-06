import {
  extractAccountName,
  extractAccountNumber,
  extractBalance,
  extractBalanceDate,
  extractBankName,
  extractCurrency,
  extractIban,
  hasExtractableText,
} from "@/lib/cash/statements/extract-fields";
import { extractPdfContent } from "@/lib/cash/statements/pdf-extract";
import type { ParsedBankStatement } from "@/lib/cash/statements/types";

export async function parseGenericBankStatement(
  buffer: Buffer,
  fileName: string,
): Promise<ParsedBankStatement> {
  const warnings: string[] = [];

  let text = "";
  let tableRows: unknown[][] = [];

  try {
    const extracted = await extractPdfContent(buffer);
    text = extracted.text;
    tableRows = extracted.tableRows;
  } catch (error) {
    return {
      parserId: "generic-bank-statement",
      bankName: null,
      accountName: null,
      accountNumber: null,
      iban: null,
      currency: null,
      balance: null,
      balanceDate: null,
      warnings: [
        error instanceof Error
          ? `PDF parsing failed: ${error.message}`
          : "PDF parsing failed.",
      ],
    };
  }

  if (!hasExtractableText(text) && tableRows.length === 0) {
    return {
      parserId: "generic-bank-statement",
      bankName: null,
      accountName: null,
      accountNumber: null,
      iban: null,
      currency: null,
      balance: null,
      balanceDate: null,
      warnings: [
        "No readable text found. Scanned/image-only PDFs are not supported in v1 — try downloading a text-based statement from your bank.",
      ],
    };
  }

  const bankName = extractBankName(text, fileName);
  const accountName = extractAccountName(text);
  const accountNumber = extractAccountNumber(text);
  const iban = extractIban(text);
  const currency = extractCurrency(text);
  const balance = extractBalance(text, tableRows);
  const balanceDate = extractBalanceDate(text) ?? new Date();

  if (!balance) warnings.push("Could not extract closing balance — enter it manually before applying.");
  if (!accountNumber && !iban) {
    warnings.push("Could not extract account number or IBAN — verify the target account before applying.");
  }
  if (!extractBalanceDate(text)) {
    warnings.push("Statement date not found — using today's date. Adjust before applying if needed.");
  }
  if (!currency) warnings.push("Currency not detected — account currency will be used when applying.");

  return {
    parserId: "generic-bank-statement",
    bankName,
    accountName,
    accountNumber,
    iban,
    currency,
    balance,
    balanceDate,
    warnings,
  };
}
