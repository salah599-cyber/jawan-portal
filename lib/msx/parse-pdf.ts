import type { ParseReportResult } from "./types";
import { detectBroker, extractAccountNumber, extractAsOfDate } from "./detect-broker";
import { dedupeHoldings, parsePdfTableText, parseTextLines, rowsToHoldings } from "./holdings";
import { loadPdfRuntime } from "./pdf-runtime";

async function extractPdfContent(buffer: Buffer): Promise<{ text: string; tableRows: unknown[][] }> {
  const { PDFParse, CanvasFactory } = await loadPdfRuntime();
  const parser = new PDFParse({ data: buffer, CanvasFactory });

  try {
    const textResult = await parser.getText();
    let tableRows: unknown[][] = [];

    try {
      const tableResult = await parser.getTable();
      if (tableResult?.pages) {
        for (const page of tableResult.pages) {
          for (const table of page.tables ?? []) {
            for (const row of table) {
              tableRows.push(row);
            }
          }
        }
      }
    } catch {
      tableRows = [];
    }

    return { text: textResult.text ?? "", tableRows };
  } finally {
    await parser.destroy();
  }
}

export async function parsePdfReport(buffer: Buffer, fileName: string): Promise<ParseReportResult> {
  const warnings: string[] = [];

  let text = "";
  let tableRows: unknown[][] = [];

  try {
    const extracted = await extractPdfContent(buffer);
    text = extracted.text;
    tableRows = extracted.tableRows;
  } catch (error) {
    return {
      broker: detectBroker(fileName, ""),
      holdings: [],
      warnings: [
        error instanceof Error
          ? `PDF parsing failed: ${error.message}`
          : "PDF parsing failed. Try uploading the Excel version of your broker statement.",
      ],
    };
  }

  if (!text.trim() && tableRows.length === 0) {
    return {
      broker: detectBroker(fileName, ""),
      holdings: [],
      warnings: ["Could not extract readable content from this PDF."],
    };
  }

  const broker = detectBroker(fileName, text);
  const accountNumber = extractAccountNumber(text);
  const asOfDate = extractAsOfDate(text);

  const tableHoldings = tableRows.length > 0 ? rowsToHoldings(tableRows) : [];
  const textHoldings = dedupeHoldings([...parseTextLines(text), ...parsePdfTableText(text)]);
  const holdings = dedupeHoldings([...tableHoldings, ...textHoldings]);

  if (holdings.length === 0) {
    warnings.push("No MSX holdings were detected in this PDF. The report format may not be supported yet.");
  } else if (tableHoldings.length === 0) {
    warnings.push("Holdings were inferred from PDF text. Verify quantities and values against your broker statement.");
  }

  return { broker, accountNumber, asOfDate, holdings, warnings };
}
