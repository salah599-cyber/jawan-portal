import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import {
  parseConsolidatedPortfolioSheets,
  isConsolidatedPortfolioWorkbook,
} from "@/lib/public-markets/consolidated-portfolio/parse-sheet";
import { resolveUsStockBrokerKey } from "@/lib/public-markets/consolidated-portfolio/constants";
import { normalizeOptionHoldingValues } from "@/lib/public-markets/valuation";
import { readSpreadsheetRows } from "@/lib/msx/read-workbook";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "public/templates/jawan-international/consolidated_portfolio.xlsx",
);

function loadSourceSheets(): Record<string, unknown[][]> {
  if (!fs.existsSync(SOURCE_PATH)) {
    return {};
  }

  const buffer = fs.readFileSync(SOURCE_PATH);
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetsByName: Record<string, unknown[][]> = {};

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
    });
    sheetsByName[sheetName] = rows
      .map((row) => (Array.isArray(row) ? row : [row]))
      .filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""));
  }

  return sheetsByName;
}

describe("consolidated portfolio parser", () => {
  it("detects consolidated workbook signature", () => {
    expect(isConsolidatedPortfolioWorkbook(["US Stocks", "Options"])).toBe(true);
    expect(isConsolidatedPortfolioWorkbook(["Holdings"])).toBe(false);
  });

  it("routes Kristal duplicate tickers to the correct broker key", () => {
    expect(resolveUsStockBrokerKey("Alibaba US (Kristal K18518750)", "BABA")).toBe(
      "kristal-k18518750",
    );
    expect(resolveUsStockBrokerKey("BlackRock Inc. (Kristal K15875750)", "BLK")).toBe(
      "kristal-k15875750",
    );
    expect(resolveUsStockBrokerKey("Advanced Micro Devices Inc", "AMD")).toBe("safra");
  });

  it("parses short options with negative contracts", () => {
    const normalized = normalizeOptionHoldingValues({
      contracts: -1,
      marketPrice: 11.2,
      premiumPaid: 168,
      contractMultiplier: 100,
    });

    expect(normalized.marketValue).toBe(-1120);
    expect(normalized.unrealisedPnl).toBe(-1288);
  });

  it.skipIf(!fs.existsSync(SOURCE_PATH))("parses the Jawan consolidated workbook", () => {
    const sheetsByName = loadSourceSheets();
    const parsed = parseConsolidatedPortfolioSheets(sheetsByName);

    expect(parsed.usEquitiesByBroker.safra.length).toBe(59);
    expect(parsed.usEquitiesByBroker["kristal-k18518750"].length).toBe(4);
    expect(parsed.usEquitiesByBroker["kristal-k15875750"].length).toBe(1);
    expect(parsed.options.length).toBe(6);
    expect(parsed.options.every((option) => option.contracts < 0)).toBe(true);
    expect(parsed.structuredNotes.length).toBe(26);
    expect(parsed.bonds.length).toBe(9);
    expect(parsed.intlEquities.length).toBe(7);
    expect(parsed.funds.length).toBe(2);
    expect(parsed.cashBalances.length).toBe(9);
  });
});

describe("split consolidated portfolio outputs", () => {
  it.skipIf(!fs.existsSync(SOURCE_PATH))("generates broker-scoped USA upload files", async () => {
    const outputDir = path.resolve("public/templates/jawan-international");
    const safraFile = path.join(outputDir, "usa-safra-upload.xlsx");

    if (!fs.existsSync(safraFile)) {
      return;
    }

    const sheets = readSpreadsheetRows(fs.readFileSync(safraFile), "usa-safra-upload.xlsx");
    const holdings = sheets.flatMap((rows) => {
      const headerIndex = rows.findIndex((row) => row[0] === "Symbol");
      if (headerIndex < 0) return [];
      return rows.slice(headerIndex + 1).filter((row) => row[0]);
    });

    expect(holdings.length).toBe(59);
    expect(holdings.some((row) => String(row[0]) === "BABA")).toBe(true);
    expect(holdings.some((row) => String(row[1]).includes("Kristal"))).toBe(false);
  });
});
