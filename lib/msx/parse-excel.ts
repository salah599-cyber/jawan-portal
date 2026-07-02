import { readSpreadsheetRows } from "./read-workbook";
import type { ParseReportResult } from "./types";
import { detectBroker, extractAccountNumber, extractAsOfDate } from "./detect-broker";
import { dedupeHoldings, rowsToHoldings } from "./holdings";

export async function parseExcelReport(buffer: Buffer, fileName: string): Promise<ParseReportResult> {
  const warnings: string[] = [];
  const allHoldings = [];

  let sheets: unknown[][][];
  try {
    sheets = readSpreadsheetRows(buffer, fileName);
  } catch (error) {
    return {
      broker: detectBroker(fileName, ""),
      holdings: [],
      warnings: [
        error instanceof Error
          ? `Could not read spreadsheet: ${error.message}`
          : "Could not read spreadsheet. Save the file as .xlsx and try again.",
      ],
    };
  }

  if (sheets.length === 0) {
    return {
      broker: detectBroker(fileName, ""),
      holdings: [],
      warnings: ["The spreadsheet appears to be empty."],
    };
  }

  for (const rows of sheets) {
    const holdings = rowsToHoldings(rows);
    if (holdings.length > 0) {
      allHoldings.push(...holdings);
    }
  }

  const flatText = sheets
    .map((rows) => rows.map((row) => row.map((cell) => String(cell ?? "")).join(" ")).join("\n"))
    .join("\n");

  const broker = detectBroker(fileName, flatText);
  const accountNumber = extractAccountNumber(flatText);
  const asOfDate = extractAsOfDate(flatText);
  const holdings = dedupeHoldings(allHoldings);

  if (holdings.length === 0) {
    warnings.push(
      "No MSX holdings were detected in this spreadsheet. Ensure the file has stock symbol and quantity columns, or save a fresh export as .xlsx.",
    );
  }

  return { broker, accountNumber, asOfDate, holdings, warnings };
}
