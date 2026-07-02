import { PDFParse } from "pdf-parse";
import type { ParseReportResult } from "./types";
import { detectBroker, extractAccountNumber, extractAsOfDate } from "./detect-broker";
import { dedupeHoldings, parseTextLines, rowsToHoldings } from "./holdings";

async function extractPdfContent(buffer: Buffer): Promise<{ text: string; tableRows: unknown[][] }> {
  const parser = new PDFParse({ data: buffer });
  try {
    const [textResult, tableResult] = await Promise.all([
      parser.getText(),
      parser.getTable().catch(() => null),
    ]);

    const tableRows: unknown[][] = [];
    if (tableResult?.pages) {
      for (const page of tableResult.pages) {
        for (const table of page.tables ?? []) {
          for (const row of table) {
            tableRows.push(row);
          }
        }
      }
    }

    return { text: textResult.text ?? "", tableRows };
  } finally {
    await parser.destroy();
  }
}

export async function parsePdfReport(buffer: Buffer, fileName: string): Promise<ParseReportResult> {
  const warnings: string[] = [];
  const { text, tableRows } = await extractPdfContent(buffer);

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
  const textHoldings = parseTextLines(text);
  const holdings = dedupeHoldings([...tableHoldings, ...textHoldings]);

  if (holdings.length === 0) {
    warnings.push("No MSX holdings were detected in this PDF. The report format may not be supported yet.");
  } else if (tableHoldings.length === 0) {
    warnings.push("Holdings were inferred from PDF text. Verify quantities and values against your broker statement.");
  }

  return { broker, accountNumber, asOfDate, holdings, warnings };
}
