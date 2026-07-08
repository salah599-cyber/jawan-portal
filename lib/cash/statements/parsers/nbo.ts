import {
  extractAccountName,
  extractAccountNumber,
  extractBalance,
  extractBalanceDate,
  extractCurrency,
  extractIban,
  extractLastPostingDate,
  extractLastRunningBalance,
  extractStatementHeaderAccount,
  isTransactionAccountStatement,
  parseAmount,
} from "@/lib/cash/statements/extract-fields";
import {
  assertExtractableText,
  finalizeParsed,
  type ExtractedPdf,
} from "@/lib/cash/statements/parsers/common";
import type { ParsedBankStatement } from "@/lib/cash/statements/types";

const PARSER_ID = "nbo";

function extractNboAccountNumber(text: string): string | null {
  const header = extractStatementHeaderAccount(text);
  if (header.accountNumber) return header.accountNumber;

  const patterns = [
    /account\s+no\.?\s*[:\s]*([0-9]{8,16})/i,
    /a\/c\s+no\.?\s*[:\s]*([0-9]{8,16})/i,
    /customer\s+account[:\s]*([0-9]{8,16})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].replace(/\s+/g, "");
  }

  return null;
}

function extractNboBalance(text: string, tableRows: unknown[][]): number | null {
  if (isTransactionAccountStatement(text)) {
    const runningBalance = extractLastRunningBalance(text);
    if (runningBalance != null) return runningBalance;
  }

  const patterns = [
    /closing\s+balance[:\s]+(?:OMR|USD|EUR|GBP|AED)?\s*([0-9,]+\.?\d*)/i,
    /book\s+balance[:\s]+([0-9,]+\.?\d*)/i,
    /available\s+balance[:\s]+([0-9,]+\.?\d*)/i,
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

function extractNboBalanceDate(text: string): Date | null {
  if (isTransactionAccountStatement(text)) {
    return extractLastPostingDate(text);
  }

  return extractBalanceDate(text);
}

export function parseNboStatement(content: ExtractedPdf, _fileName: string): ParsedBankStatement {
  const blocked = assertExtractableText(PARSER_ID, content);
  if (blocked) return blocked;

  const { text, tableRows } = content;
  const warnings: string[] = [];
  const header = extractStatementHeaderAccount(text);
  const accountNumber = extractNboAccountNumber(text) ?? extractAccountNumber(text);
  const iban = extractIban(text);
  const currency = extractCurrency(text) ?? "OMR";
  const balance = extractNboBalance(text, tableRows);
  const balanceDate = extractNboBalanceDate(text) ?? new Date();
  const accountName = header.accountName ?? extractAccountName(text);

  if (!balance) warnings.push("Closing balance not detected — enter it manually before applying.");
  if (!accountNumber && !iban) {
    warnings.push("Account number and IBAN not detected — select the account manually before applying.");
  }
  if (!extractNboBalanceDate(text)) {
    warnings.push("Statement date not detected — today's date is pre-filled. Adjust if needed.");
  }

  return finalizeParsed(
    PARSER_ID,
    {
      bankName: "National Bank of Oman",
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
