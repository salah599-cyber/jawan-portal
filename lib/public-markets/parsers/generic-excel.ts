import type { PublicMarket } from "@/lib/generated/prisma/client";
import { readSpreadsheetRows } from "@/lib/msx/read-workbook";
import { MARKET_CONFIG } from "@/lib/public-markets/constants";
import { dedupeHoldings, rowsToHoldings } from "@/lib/public-markets/holdings";
import {
  detectBroker,
  extractAccountNumber,
  extractAsOfDate,
  type BrokerSignature,
} from "@/lib/public-markets/parsers/common";
import { CHINA_BROKER_SIGNATURES } from "@/lib/public-markets/parsers/china";
import { HK_BROKER_SIGNATURES } from "@/lib/public-markets/parsers/hk";
import { INDIA_BROKER_SIGNATURES } from "@/lib/public-markets/parsers/india";
import { UK_BROKER_SIGNATURES } from "@/lib/public-markets/parsers/uk";
import { US_BROKER_SIGNATURES } from "@/lib/public-markets/parsers/us";
import type { ParseReportResult } from "@/lib/public-markets/types";

const MARKET_BROKERS: Record<PublicMarket, BrokerSignature[]> = {
  MSX: [],
  UAE: [],
  SAUDI_ARABIA: [],
  KUWAIT: [],
  BAHRAIN: [],
  QATAR: [],
  USA: US_BROKER_SIGNATURES,
  HONG_KONG: HK_BROKER_SIGNATURES,
  CHINA: CHINA_BROKER_SIGNATURES,
  INDIA: INDIA_BROKER_SIGNATURES,
  UK: UK_BROKER_SIGNATURES,
  OTHER: [
    ...US_BROKER_SIGNATURES,
    ...HK_BROKER_SIGNATURES,
    ...UK_BROKER_SIGNATURES,
    ...INDIA_BROKER_SIGNATURES,
    ...CHINA_BROKER_SIGNATURES,
  ],
};

export async function parseGenericExcelReport(
  buffer: Buffer,
  fileName: string,
  market: PublicMarket,
): Promise<ParseReportResult> {
  const warnings: string[] = [];
  const allHoldings = [];

  let sheets: unknown[][][];
  try {
    sheets = readSpreadsheetRows(buffer, fileName);
  } catch (error) {
    return {
      broker: detectBroker(fileName, "", MARKET_BROKERS[market]),
      holdings: [],
      warnings: [
        error instanceof Error
          ? `Could not read spreadsheet: ${error.message}`
          : "Could not read spreadsheet. Save the file as .xlsx and try again.",
      ],
      parserId: `generic-excel:${market}`,
    };
  }

  if (sheets.length === 0) {
    return {
      broker: detectBroker(fileName, "", MARKET_BROKERS[market]),
      holdings: [],
      warnings: ["The spreadsheet appears to be empty."],
      parserId: `generic-excel:${market}`,
    };
  }

  for (const rows of sheets) {
    const holdings = rowsToHoldings(rows, market);
    if (holdings.length > 0) {
      allHoldings.push(...holdings);
    }
  }

  const flatText = sheets
    .map((rows) => rows.map((row) => row.map((cell) => String(cell ?? "")).join(" ")).join("\n"))
    .join("\n");

  const broker = detectBroker(fileName, flatText, MARKET_BROKERS[market]);
  const accountNumber = extractAccountNumber(flatText);
  const asOfDate = extractAsOfDate(flatText);
  const holdings = dedupeHoldings(allHoldings);

  if (holdings.length === 0) {
    warnings.push(
      `No ${MARKET_CONFIG[market].shortLabel} holdings were detected. Ensure the file has symbol and quantity columns, or save a fresh export as .xlsx.`,
    );
  }

  return {
    broker,
    accountNumber,
    asOfDate,
    holdings,
    warnings,
    parserId: `generic-excel:${market}`,
  };
}
