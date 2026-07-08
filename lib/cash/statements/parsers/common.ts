import { hasExtractableText } from "@/lib/cash/statements/extract-fields";
import { extractPdfContent } from "@/lib/cash/statements/pdf-extract";
import type { ParsedBankStatement } from "@/lib/cash/statements/types";

export type ExtractedPdf = {
  text: string;
  tableRows: unknown[][];
};

export async function loadStatementPdf(
  buffer: Buffer,
): Promise<{ ok: true; content: ExtractedPdf } | { ok: false; error: string }> {
  try {
    const content = await extractPdfContent(buffer);
    return { ok: true, content };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? `PDF parsing failed: ${error.message}` : "PDF parsing failed.",
    };
  }
}

export function failParsed(parserId: string, warnings: string[]): ParsedBankStatement {
  return {
    parserId,
    bankName: null,
    accountName: null,
    accountNumber: null,
    iban: null,
    currency: null,
    balance: null,
    balanceDate: null,
    warnings,
  };
}

export function noTextParsed(parserId: string): ParsedBankStatement {
  return failParsed(parserId, [
    "No readable text found. Scanned/image-only PDFs are not supported — try downloading a text-based statement from your bank.",
  ]);
}

export function assertExtractableText(
  parserId: string,
  content: ExtractedPdf,
): ParsedBankStatement | null {
  if (!hasExtractableText(content.text) && content.tableRows.length === 0) {
    return noTextParsed(parserId);
  }
  return null;
}

export function finalizeParsed(
  parserId: string,
  fields: Omit<ParsedBankStatement, "parserId" | "warnings">,
  warnings: string[],
): ParsedBankStatement {
  return { parserId, ...fields, warnings };
}
