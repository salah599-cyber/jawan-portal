import { parseGenericBankStatement } from "@/lib/cash/statements/parsers/generic";
import type { ParsedBankStatement } from "@/lib/cash/statements/types";

export async function parseBankStatementPdf(
  buffer: Buffer,
  fileName: string,
): Promise<ParsedBankStatement> {
  // v1: generic parser for all banks; bank-specific parsers can plug in here later.
  return parseGenericBankStatement(buffer, fileName);
}
