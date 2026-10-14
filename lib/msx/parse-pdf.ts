import type { ParseReportResult } from "./types";
import { detectBroker, extractAccountNumber, extractAsOfDate } from "./detect-broker";
import { dedupeHoldings, parsePdfTableText, parseTextLines, rowsToHoldings } from "./holdings";
import { isUCapitalReport, parseUCapitalReport } from "./parse-ucapital";
import { loadPdfRuntime } from "./pdf-runtime";

function collectTableRows(tableResult: {
  pages?: Array<{ tables?: unknown[][][] }>;
} | null | undefined): unknown[][] {
  const tableRows: unknown[][] = [];
  for (const page of tableResult?.pages ?? []) {
    for (const table of page.tables ?? []) {
      for (const row of table) {
        tableRows.push(row);
      }
    }
  }
  return tableRows;
}

async function extractPdfTables(
  parser: InstanceType<typeof import("pdf-parse").PDFParse>,
  pageCount: number,
): Promise<unknown[][]> {
  try {
    return collectTableRows(await parser.getTable());
  } catch {
    // Some U-Capital pages crash pdf-parse's geometry Table.toData(). Isolate
    // per page so one bad page does not discard the rest of the statement.
  }

  const tableRows: unknown[][] = [];
  for (let page = 1; page <= pageCount; page += 1) {
    try {
      tableRows.push(...collectTableRows(await parser.getTable({ partial: [page] })));
    } catch {
      // Skip the failing page; text-line fallback still covers missing rows.
    }
  }
  return tableRows;
}

async function extractPdfContent(buffer: Buffer): Promise<{ text: string; tableRows: unknown[][] }> {
  const { PDFParse, CanvasFactory } = await loadPdfRuntime();
  const parser = new PDFParse({ data: buffer, CanvasFactory });

  try {
    const textResult = await parser.getText();
    const pageCount =
      typeof textResult.total === "number" && textResult.total > 0
        ? textResult.total
        : Math.max(1, textResult.pages?.length ?? 1);
    const tableRows = await extractPdfTables(parser, pageCount);

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

  if (isUCapitalReport(fileName, text)) {
    return parseUCapitalReport(text, tableRows, fileName);
  }

  const broker = detectBroker(fileName, text);
  const accountNumber = extractAccountNumber(text);
  const asOfDate = extractAsOfDate(text);

  const tableHoldings = tableRows.length > 0 ? rowsToHoldings(tableRows) : [];
  const textHoldings = dedupeHoldings([...parseTextLines(text), ...parsePdfTableText(text)]);
  // Prefer structured table rows; only fall back to text heuristics when tables
  // yield nothing. Merging both previously let noisy PDF text overwrite good values.
  const holdings =
    tableHoldings.length > 0 ? tableHoldings : textHoldings;

  if (holdings.length === 0) {
    warnings.push("No MSX holdings were detected in this PDF. The report format may not be supported yet.");
  } else if (tableHoldings.length === 0) {
    warnings.push("Holdings were inferred from PDF text. Verify quantities and values against your broker statement.");
  }

  return { broker, accountNumber, asOfDate, holdings, warnings };
}
