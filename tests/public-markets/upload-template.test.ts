import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { rowsToHoldings } from "@/lib/public-markets/holdings";
import {
  buildPortfolioUploadTemplateBuffer,
  buildUploadTemplateBuffer,
} from "@/lib/public-markets/upload-template";
import { readSpreadsheetRows } from "@/lib/msx/read-workbook";

describe("public market upload templates", () => {
  it.each(["MSX", "USA"] as const)("parses the %s template", async (market) => {
    const { buffer, fileName } = await buildUploadTemplateBuffer(market);
    expect(buffer.byteLength).toBeGreaterThan(0);

    const sheets = readSpreadsheetRows(buffer, fileName);
    const holdings = sheets.flatMap((rows) => rowsToHoldings(rows, market));

    expect(holdings.length).toBeGreaterThan(0);
    expect(holdings.every((holding) => holding.quantity > 0)).toBe(true);
  });

  it("builds a portfolio template with Oman, US, and Options sheets", async () => {
    const { buffer, fileName } = await buildPortfolioUploadTemplateBuffer();
    expect(fileName).toBe("portfolio-upload-template.xlsx");

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0]);

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Oman Stocks",
      "US Stocks",
      "Options",
    ]);

    const omanSheet = workbook.getWorksheet("Oman Stocks");
    const usSheet = workbook.getWorksheet("US Stocks");
    const optionsSheet = workbook.getWorksheet("Options");

    expect(omanSheet?.getCell("A5").value).toBe("Symbol");
    expect(omanSheet?.getCell("A6").value).toBe("BKMB");
    expect(usSheet?.getCell("A6").value).toBe("AAPL");
    expect(optionsSheet?.getCell("A5").value).toBe("Underlying Symbol");
    expect(optionsSheet?.getCell("A6").value).toBe("AAPL");

    const sheets = readSpreadsheetRows(buffer, fileName);
    const omanHoldings = rowsToHoldings(sheets[0] ?? [], "MSX");
    const usHoldings = rowsToHoldings(sheets[1] ?? [], "USA");

    expect(omanHoldings.length).toBeGreaterThan(0);
    expect(usHoldings.length).toBeGreaterThan(0);
  });
});
