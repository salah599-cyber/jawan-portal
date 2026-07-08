import {
  extractAccountName,
  extractAccountNumber,
  extractBalance,
  extractBalanceDate,
  extractBankName,
  extractCurrency,
  extractIban,
} from "@/lib/cash/statements/extract-fields";
import {
  assertExtractableText,
  finalizeParsed,
  loadStatementPdf,
  type ExtractedPdf,
} from "@/lib/cash/statements/parsers/common";
import type { ParsedBankStatement } from "@/lib/cash/statements/types";

const PARSER_ID = "generic-bank-statement";

export function parseGenericBankStatement(
  content: ExtractedPdf,
  fileName: string,
): ParsedBankStatement {
  const blocked = assertExtractableText(PARSER_ID, content);
  if (blocked) return blocked;

  const { text, tableRows } = content;
  const warnings: string[] = [];
  const bankName = extractBankName(text, fileName);
  const accountName = extractAccountName(text);
  const accountNumber = extractAccountNumber(text);
  const iban = extractIban(text);
  const currency = extractCurrency(text);
  const balance = extractBalance(text, tableRows);
  const balanceDate = extractBalanceDate(text) ?? new Date();

  if (!balance) warnings.push("Closing balance not detected — enter it manually before applying.");
  if (!accountNumber && !iban) {
    warnings.push("Account number and IBAN not detected — select the account manually before applying.");
  }
  if (!extractBalanceDate(text)) {
    warnings.push("Statement date not detected — today's date is pre-filled. Adjust if needed.");
  }
  if (!currency) warnings.push("Currency not detected — the account currency will be used when applying.");

  return finalizeParsed(
    PARSER_ID,
    {
      bankName,
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

export async function parseGenericBankStatementPdf(
  buffer: Buffer,
  fileName: string,
): Promise<ParsedBankStatement> {
  const loaded = await loadStatementPdf(buffer);
  if (!loaded.ok) {
    return {
      parserId: PARSER_ID,
      bankName: null,
      accountName: null,
      accountNumber: null,
      iban: null,
      currency: null,
      balance: null,
      balanceDate: null,
      warnings: [loaded.error],
    };
  }

  return parseGenericBankStatement(loaded.content, fileName);
}
