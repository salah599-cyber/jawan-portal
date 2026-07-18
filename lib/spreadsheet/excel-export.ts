import ExcelJS from "exceljs";

export async function aoaToExcelBuffer(
  sheetName: string,
  rows: (string | number | null | undefined)[][],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  for (const row of rows) {
    worksheet.addRow(row.map((cell) => cell ?? ""));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function recordsToExcelBuffer(
  sheetName: string,
  rows: Record<string, string | number | null | undefined>[],
  headers?: string[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  const columnHeaders = headers ?? (rows[0] ? Object.keys(rows[0]) : []);

  if (columnHeaders.length > 0) {
    worksheet.addRow(columnHeaders);
    for (const row of rows) {
      worksheet.addRow(columnHeaders.map((header) => row[header] ?? ""));
    }
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function encodeExcelDownload(buffer: Buffer, fileName: string): {
  fileName: string;
  base64: string;
  mimeType: string;
} {
  return {
    fileName,
    base64: buffer.toString("base64"),
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}
