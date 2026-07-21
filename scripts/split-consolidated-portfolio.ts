#!/usr/bin/env node
/**
 * Splits consolidated_portfolio.xlsx into broker-scoped USA upload files
 * and a full international workbook ready for consolidated import.
 *
 * Usage:
 *   npx tsx scripts/split-consolidated-portfolio.ts [source.xlsx] [outputDir]
 */
import fs from "node:fs";
import path from "node:path";
import {
  CONSOLIDATED_BROKER_CONFIG,
  resolveUsStockBrokerKey,
  type ConsolidatedBrokerKey,
} from "../lib/public-markets/consolidated-portfolio/constants";
import { aoaToExcelBuffer } from "../lib/spreadsheet/excel-export";

const EQUITY_HEADERS = [
  "Symbol",
  "Name",
  "Quantity",
  "Cost Basis",
  "Market Price",
  "Market Value",
  "Unrealised P&L",
  "ISIN",
  "CUSIP",
  "SEDOL",
  "Exchange",
] as const;

async function main() {
  const sourcePath =
    process.argv[2] ??
    path.resolve("C:/Users/salah/OneDrive/Desktop/for jawaninvest upload/consolidated_portfolio.xlsx");
  const outputDir =
    process.argv[3] ?? path.resolve(process.cwd(), "public/templates/jawan-international");

  if (!fs.existsSync(sourcePath)) {
    console.error(`Source file not found: ${sourcePath}`);
    process.exit(1);
  }

  const XLSX = await import("xlsx");
  const buffer = fs.readFileSync(sourcePath);
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const usSheet = workbook.Sheets["US Stocks"];
  if (!usSheet) {
    console.error('Workbook is missing the "US Stocks" sheet.');
    process.exit(1);
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(usSheet, { header: 1, defval: "" });
  const headerIndex = rows.findIndex((row) => row[0] === "Symbol");
  if (headerIndex < 0) {
    console.error("Could not find US Stocks header row.");
    process.exit(1);
  }

  const preamble = rows.slice(0, headerIndex + 1);
  const dataRows = rows.slice(headerIndex + 1).filter((row) => row[0]);

  const byBroker: Record<ConsolidatedBrokerKey, unknown[][]> = {
    safra: [],
    "kristal-k18518750": [],
    "kristal-k15875750": [],
  };

  for (const row of dataRows) {
    const symbol = String(row[0] ?? "");
    const name = String(row[1] ?? "");
    const brokerKey = resolveUsStockBrokerKey(name, symbol);
    byBroker[brokerKey].push(row);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  for (const brokerKey of Object.keys(byBroker) as ConsolidatedBrokerKey[]) {
    const holdings = byBroker[brokerKey];
    if (holdings.length === 0) continue;

    const config = CONSOLIDATED_BROKER_CONFIG[brokerKey];
    const sheetRows = [
      [`USA Brokerage Upload — ${config.label}`],
      [
        `Upload via Public Markets → USA. Map broker account: ${config.broker} / ${config.accountNumber}. As of ${config.asOfDate}.`,
      ],
      [`Symbol format: standard US tickers. Amounts are in USD.`],
      [],
      [...EQUITY_HEADERS],
      ...holdings,
    ];

    const buffer = await aoaToExcelBuffer(
      "Holdings",
      sheetRows as (string | number | null | undefined)[][],
    );
    const fileName = `usa-${brokerKey}-upload.xlsx`;
    fs.writeFileSync(path.join(outputDir, fileName), buffer);
    console.log(`Wrote ${fileName} (${holdings.length} rows)`);
  }

  const consolidatedCopy = path.join(outputDir, "consolidated_portfolio.xlsx");
  fs.copyFileSync(sourcePath, consolidatedCopy);
  console.log(`Copied consolidated workbook to ${consolidatedCopy}`);

  const readme = `# Jawan International Portfolio Upload Files

Generated from consolidated_portfolio.xlsx.

## US equities (upload per broker account)

Create three broker accounts in Public Markets before importing:

| File | Broker | Account | Rows |
|------|--------|---------|------|
| usa-safra-upload.xlsx | ${CONSOLIDATED_BROKER_CONFIG.safra.broker} | ${CONSOLIDATED_BROKER_CONFIG.safra.accountNumber} | ${byBroker.safra.length} |
| usa-kristal-k18518750-upload.xlsx | ${CONSOLIDATED_BROKER_CONFIG["kristal-k18518750"].broker} | ${CONSOLIDATED_BROKER_CONFIG["kristal-k18518750"].accountNumber} | ${byBroker["kristal-k18518750"].length} |
| usa-kristal-k15875750-upload.xlsx | ${CONSOLIDATED_BROKER_CONFIG["kristal-k15875750"].broker} | ${CONSOLIDATED_BROKER_CONFIG["kristal-k15875750"].accountNumber} | ${byBroker["kristal-k15875750"].length} |

Upload each file via **Portfolio → Public Markets → USA**, selecting the matching broker account.

## Full consolidated import

Upload \`consolidated_portfolio.xlsx\` via the consolidated import endpoint with broker account IDs mapped for:
- safra
- kristal-k18518750
- kristal-k15875750

This imports US equities, options, structured notes, intl stocks, bonds, funds, and cash balances in one step.
`;

  fs.writeFileSync(path.join(outputDir, "README.md"), readme);
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
