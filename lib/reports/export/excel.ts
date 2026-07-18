import ExcelJS from "exceljs";
import type { ReportResult } from "@/lib/reports/types";
import { recordsToExcelBuffer } from "@/lib/spreadsheet/excel-export";

async function appendSectionSheet(
  workbookRows: { sheetName: string; rows: Record<string, string | number | null>[]; headers: string[] }[],
  name: string,
  columns: { key: string; label: string }[],
  rows: Record<string, string | number | null>[],
) {
  const safeName = name.replace(/[\\/?*[\]]/g, " ").slice(0, 31) || "Sheet";
  workbookRows.push({
    sheetName: safeName,
    rows,
    headers: columns.map((column) => column.label),
  });
}

export async function reportToWorkbook(result: ReportResult): Promise<Buffer> {
  const rows: Record<string, string | number | null>[] = [];

  if (result.metrics.length > 0) {
    rows.push({ [result.columns[0]?.label ?? "Field"]: "Summary" });
    for (const metric of result.metrics) {
      rows.push({
        [result.columns[0]?.label ?? "Field"]: metric.label,
        [result.columns[1]?.label ?? "Value"]: metric.value,
        ...(metric.detail ? { [result.columns[2]?.label ?? "Detail"]: metric.detail } : {}),
      });
    }
    rows.push({});
  }

  const tableRows = result.rows.map((row) => {
    const mapped: Record<string, string | number | null> = {};
    for (const column of result.columns) {
      mapped[column.label] = row[column.key] ?? null;
    }
    return mapped;
  });

  rows.push(...tableRows);

  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const mainBuffer = await recordsToExcelBuffer("Report", rows, headers);

  if (!result.sections?.length) {
    return mainBuffer;
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(mainBuffer as unknown as Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0]);

  for (const section of result.sections) {
    const sectionRows: { sheetName: string; rows: Record<string, string | number | null>[]; headers: string[] }[] =
      [];
    await appendSectionSheet(sectionRows, section.title, section.columns, section.rows);
    const [{ sheetName, rows: sectionData, headers: sectionHeaders }] = sectionRows;
    const worksheet = workbook.addWorksheet(sheetName);
    worksheet.addRow(sectionHeaders);
    worksheet.getRow(1).font = { bold: true };
    for (const row of sectionData) {
      worksheet.addRow(sectionHeaders.map((header) => row[header] ?? ""));
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function reportToCsv(result: ReportResult): string {
  const headers = result.columns.map((column) => column.label);
  const lines = [headers.join(",")];

  for (const row of result.rows) {
    const values = result.columns.map((column) => {
      const value = row[column.key];
      if (value == null) return "";
      const text = String(value);
      return text.includes(",") || text.includes('"') ? `"${text.replace(/"/g, '""')}"` : text;
    });
    lines.push(values.join(","));
  }

  if (result.sections?.length) {
    for (const section of result.sections) {
      lines.push("");
      lines.push(section.title);
      lines.push(section.columns.map((column) => column.label).join(","));
      for (const row of section.rows) {
        const values = section.columns.map((column) => {
          const value = row[column.key];
          if (value == null) return "";
          const text = String(value);
          return text.includes(",") || text.includes('"')
            ? `"${text.replace(/"/g, '""')}"`
            : text;
        });
        lines.push(values.join(","));
      }
    }
  }

  return lines.join("\n");
}

export function encodeExport(
  buffer: Buffer,
  fileName: string,
): { fileName: string; base64: string; mimeType: string } {
  return {
    fileName,
    base64: buffer.toString("base64"),
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}

export function encodeCsvExport(
  csv: string,
  fileName: string,
): { fileName: string; base64: string; mimeType: string } {
  return {
    fileName,
    base64: Buffer.from(csv, "utf8").toString("base64"),
    mimeType: "text/csv",
  };
}
