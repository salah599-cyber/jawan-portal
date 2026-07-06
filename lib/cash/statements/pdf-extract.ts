import { loadPdfRuntime } from "@/lib/msx/pdf-runtime";

export async function extractPdfContent(buffer: Buffer): Promise<{ text: string; tableRows: unknown[][] }> {
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
