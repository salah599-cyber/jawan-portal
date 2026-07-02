import { parseExcelReport } from "./parse-excel";
import { parsePdfReport } from "./parse-pdf";
import type { BrokerReportFile, ParseReportResult } from "./types";

function isExcel(file: BrokerReportFile): boolean {
  const name = file.fileName.toLowerCase();
  return (
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    name.endsWith(".csv") ||
    file.mimeType.includes("spreadsheet") ||
    file.mimeType.includes("excel") ||
    file.mimeType === "text/csv"
  );
}

function isPdf(file: BrokerReportFile): boolean {
  const name = file.fileName.toLowerCase();
  return name.endsWith(".pdf") || file.mimeType === "application/pdf";
}

export async function parseBrokerReport(file: BrokerReportFile): Promise<ParseReportResult> {
  if (isExcel(file)) {
    return parseExcelReport(file.buffer, file.fileName);
  }
  if (isPdf(file)) {
    return parsePdfReport(file.buffer, file.fileName);
  }

  throw new Error(`Unsupported file type for ${file.fileName}. Upload PDF or Excel (.xlsx, .xls) brokerage reports.`);
}

export async function parseBrokerReports(files: BrokerReportFile[]): Promise<ParseReportResult[]> {
  return Promise.all(files.map((file) => parseBrokerReport(file)));
}
