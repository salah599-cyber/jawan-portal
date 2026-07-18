import { describe, expect, it } from "vitest";
import { rowsToHoldings } from "@/lib/public-markets/holdings";
import { buildUploadTemplateBuffer } from "@/lib/public-markets/upload-template";
import { readSpreadsheetRows } from "@/lib/msx/read-workbook";

describe("public market upload templates", () => {
  it.each(["MSX", "USA"] as const)("parses the %s template", (market) => {
    const { buffer, fileName } = buildUploadTemplateBuffer(market);
    expect(buffer.byteLength).toBeGreaterThan(0);

    const sheets = readSpreadsheetRows(buffer, fileName);
    const holdings = sheets.flatMap((rows) => rowsToHoldings(rows, market));

    expect(holdings.length).toBeGreaterThan(0);
    expect(holdings.every((holding) => holding.quantity > 0)).toBe(true);
  });
});
