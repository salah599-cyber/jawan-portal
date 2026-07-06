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

const PARSER_ID = "bank-dhofar";

function extractBankDhofarAccountNumber(text: string): string | null {
  const patterns = [
    /account\s+number[:\s]*([0-9]{8,16})/i,
    /a\/c\s+number[:\s]*([0-9]{8,16})/i,
    /account\s+no[:\s.]*([0-9]{8,16})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].replace(/\s+/g, "");
  }

  return null;
}

function extractBankDhofarBalance(text: string, tableRows: unknown[][]): number | null {
  const patterns = [
    /closing\s+balance[:\s]+([0-9,]+\.?\d*)/i,
    /total\s+balance[:\s]+([0-9,]+\.?\d*)/i,
    /balance\s+carried\s+forward[:\s]+([0-9,]+\.?\d*)/i,
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

export function parseBankDhofarStatement(content: ExtractedPdf, _fileName: string): ParsedBankStatement {
  const blocked = assertExtractableText(PARSER_ID, content);
  if (blocked) return blocked;

  const { text, tableRows } = content;
  const warnings: string[] = [];
  const accountNumber = extractBankDhofarAccountNumber(text) ?? extractAccountNumber(text);
  const iban = extractIban(text);
  const currency = extractCurrency(text) ?? "OMR";
  const balance = extractBankDhofarBalance(text, tableRows);
  const balanceDate = extractBalanceDate(text) ?? new Date();
  const accountName = extractAccountName(text);

  if (!balance) warnings.push("Could not extract closing balance — enter it manually before applying.");
  if (!accountNumber && !iban) {
    warnings.push("Could not extract account number or IBAN — verify the target account before applying.");
  }
  if (!extractBalanceDate(text)) {
    warnings.push("Statement date not found — using today's date. Adjust before applying if needed.");
  }

  return finalizeParsed(
    PARSER_ID,
    {
      bankName: "Bank Dhofar",
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
