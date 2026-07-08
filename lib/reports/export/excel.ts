import * as XLSX from "xlsx";
import type { ReportResult } from "@/lib/reports/types";

export function reportToWorkbook(result: ReportResult): Buffer {
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

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
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
