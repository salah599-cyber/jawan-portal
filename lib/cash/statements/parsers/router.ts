import { detectIssuingBank } from "@/lib/cash/statements/extract-fields";
import { parseGenericBankStatement } from "@/lib/cash/statements/parsers/generic";
import { parseBankDhofarStatement } from "@/lib/cash/statements/parsers/bank-dhofar";
import { parseBankMuscatStatement } from "@/lib/cash/statements/parsers/bank-muscat";
import { failParsed, loadStatementPdf } from "@/lib/cash/statements/parsers/common";
import { parseHsbcStatement } from "@/lib/cash/statements/parsers/hsbc";
import { parseNboStatement } from "@/lib/cash/statements/parsers/nbo";
import type { ParsedBankStatement } from "@/lib/cash/statements/types";

export type BankStatementParserId =
  | "bank-muscat"
  | "nbo"
  | "bank-dhofar"
  | "hsbc"
  | "generic-bank-statement";

export function detectBankStatementParser(text: string, fileName: string): BankStatementParserId {
  return detectIssuingBank(text, fileName) ?? "generic-bank-statement";
}

export async function parseBankStatementPdf(
  buffer: Buffer,
  fileName: string,
): Promise<ParsedBankStatement> {
  const loaded = await loadStatementPdf(buffer);
  if (!loaded.ok) {
    return failParsed("generic-bank-statement", [loaded.error]);
  }

  const parserId = detectBankStatementParser(loaded.content.text, fileName);

  switch (parserId) {
    case "bank-muscat":
      return parseBankMuscatStatement(loaded.content, fileName);
    case "nbo":
      return parseNboStatement(loaded.content, fileName);
    case "bank-dhofar":
      return parseBankDhofarStatement(loaded.content, fileName);
    case "hsbc":
      return parseHsbcStatement(loaded.content, fileName);
    default:
      return parseGenericBankStatement(loaded.content, fileName);
  }
}
