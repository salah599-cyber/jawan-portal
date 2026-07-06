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

const PARSER_ID = "hsbc";

function extractHsbcAccountNumber(text: string): string | null {
  const patterns = [
    /account\s+number[:\s]*([0-9]{8,20})/i,
    /sort\s+code[:\s]*[0-9\-]+\s+account[:\s]*([0-9]{8,12})/i,
    /account\s+no\.?\s*[:\s]*([0-9]{8,20})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].replace(/\s+/g, "");
  }

  return null;
}

function extractHsbcSwift(text: string): string | null {
  const match = text.match(/\b([A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)\b/);
  if (!match?.[1]) return null;
  const code = match[1];
  return code.startsWith("HSBC") || code.includes("OMRX") ? code : null;
}

function extractHsbcBalance(text: string, tableRows: unknown[][]): number | null {
  const patterns = [
    /balance\s+on[:\s]+[0-9/.\-\s]+[:\s]+([0-9,]+\.?\d*)/i,
    /closing\s+balance[:\s]+(?:[A-Z]{3}\s*)?([0-9,]+\.?\d*)/i,
    /total\s+payments\s+in[:\s\S]*?balance[:\s]+([0-9,]+\.?\d*)/i,
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

export function parseHsbcStatement(content: ExtractedPdf, _fileName: string): ParsedBankStatement {
  const blocked = assertExtractableText(PARSER_ID, content);
  if (blocked) return blocked;

  const { text, tableRows } = content;
  const warnings: string[] = [];
  const accountNumber = extractHsbcAccountNumber(text) ?? extractAccountNumber(text);
  const iban = extractIban(text);
  const currency = extractCurrency(text) ?? "OMR";
  const balance = extractHsbcBalance(text, tableRows);
  const balanceDate = extractBalanceDate(text) ?? new Date();
  const accountName = extractAccountName(text);
  const swiftCode = extractHsbcSwift(text);

  if (!balance) warnings.push("Could not extract closing balance — enter it manually before applying.");
  if (!accountNumber && !iban) {
    warnings.push("Could not extract account number or IBAN — verify the target account before applying.");
  }
  if (!extractBalanceDate(text)) {
    warnings.push("Statement date not found — using today's date. Adjust before applying if needed.");
  }
  if (swiftCode) {
    warnings.push(`SWIFT/BIC detected: ${swiftCode} — add to account details if needed.`);
  }

  return finalizeParsed(
    PARSER_ID,
    {
      bankName: "HSBC",
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
