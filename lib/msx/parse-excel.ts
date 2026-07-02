import ExcelJS from "exceljs";
import type { ParseReportResult } from "./types";
import { detectBroker, extractAccountNumber, extractAsOfDate } from "./detect-broker";
import { dedupeHoldings, rowsToHoldings } from "./holdings";

function sheetToRows(sheet: ExcelJS.Worksheet): unknown[][] {
  const rows: unknown[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = row.values;
    if (!values) return;
    const cells = Array.isArray(values) ? values.slice(1) : [];
    rows.push(cells);
  });
  return rows;
}

export async function parseExcelReport(buffer: Buffer, fileName: string): Promise<ParseReportResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as import("exceljs").Buffer);

  const warnings: string[] = [];
  const allHoldings = [];

  for (const sheet of workbook.worksheets) {
    const rows = sheetToRows(sheet);
    if (rows.length === 0) continue;
    const holdings = rowsToHoldings(rows);
    if (holdings.length > 0) {
      allHoldings.push(...holdings);
    }
  }

  const flatText = workbook.worksheets
    .map((sheet) => sheetToRows(sheet).map((row) => row.map((cell) => String(cell ?? "")).join(" ")).join("\n"))
    .join("\n");

  const broker = detectBroker(fileName, flatText);
  const accountNumber = extractAccountNumber(flatText);
  const asOfDate = extractAsOfDate(flatText);
  const holdings = dedupeHoldings(allHoldings);

  if (holdings.length === 0) {
    warnings.push("No MSX holdings were detected in this spreadsheet. Check that symbol and quantity columns are present.");
  }

  return { broker, accountNumber, asOfDate, holdings, warnings };
}
