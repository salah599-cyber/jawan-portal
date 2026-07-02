import type { PublicMarket } from "@/lib/generated/prisma/client";
import { parseBrokerReport as parseMsxBrokerReport } from "@/lib/msx/parse-report";
import { parseGenericExcelReport } from "@/lib/public-markets/parsers/generic-excel";
import type { BrokerReportFile, ParseReportResult } from "@/lib/public-markets/types";

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

export async function parseMarketReport(
  file: BrokerReportFile,
  market: PublicMarket,
): Promise<ParseReportResult> {
  if (market === "MSX") {
    const result = await parseMsxBrokerReport(file);
    return { ...result, parserId: "msx-native" };
  }

  if (isExcel(file)) {
    return parseGenericExcelReport(file.buffer, file.fileName, market);
  }

  if (isPdf(file) && market === "OTHER") {
    const { parsePdfReport } = await import("@/lib/msx/parse-pdf");
    const result = await parsePdfReport(file.buffer, file.fileName);
    return {
      ...result,
      holdings: result.holdings.map((holding) => ({
        ...holding,
        currency: holding.currency ?? "USD",
      })),
      parserId: "pdf-fallback:OTHER",
    };
  }

  throw new Error(
    `Unsupported file type for ${file.fileName}. Upload Excel (.xlsx, .xls, .csv) brokerage reports for ${market}.`,
  );
}

export async function parseMarketReports(
  files: BrokerReportFile[],
  market: PublicMarket,
): Promise<ParseReportResult[]> {
  return Promise.all(files.map((file) => parseMarketReport(file, market)));
}
