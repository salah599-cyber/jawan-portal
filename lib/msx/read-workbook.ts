import * as XLSX from "xlsx";

export function readSpreadsheetRows(buffer: Buffer, fileName: string): unknown[][][] {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
    raw: false,
  });

  const sheets: unknown[][][] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
    });

    const normalized = rows
      .map((row) => (Array.isArray(row) ? row : [row]))
      .map((row) => row.map(normalizeCell))
      .filter((row) => row.some((cell) => String(cell).trim() !== ""));

    if (normalized.length > 0) {
      sheets.push(normalized);
    }
  }

  return sheets;
}

function normalizeCell(cell: unknown): unknown {
  if (cell instanceof Date) return cell;
  if (typeof cell === "number" && Number.isFinite(cell)) return cell;
  if (cell == null) return "";
  return String(cell).trim();
}
