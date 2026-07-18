import ExcelJS from "exceljs";

export type ExcelSheetRows = {
  name: string;
  rows: (string | number | null | undefined)[][];
  columnWidths?: number[];
};

export async function multiSheetAoaToExcelBuffer(sheets: ExcelSheetRows[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name);
    for (const row of sheet.rows) {
      worksheet.addRow(row.map((cell) => cell ?? ""));
    }
    if (sheet.columnWidths?.length) {
      sheet.columnWidths.forEach((width, index) => {
        worksheet.getColumn(index + 1).width = width;
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function aoaToExcelBuffer(
  sheetName: string,
  rows: (string | number | null | undefined)[][],
): Promise<Buffer> {
  return multiSheetAoaToExcelBuffer([{ name: sheetName, rows }]);
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
