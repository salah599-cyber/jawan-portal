"use server";

import { encodeCsvExport, encodeExport, reportToCsv, reportToWorkbook } from "@/lib/reports/export/excel";
import { generateReport } from "@/lib/data/reports";
import { getReportDefinition } from "@/lib/reports/catalog";
import { requireModuleAccess } from "@/lib/permissions/access";
import type { ReportExportFormat, ReportId } from "@/lib/reports/types";

function parseReportId(value: string): ReportId {
  const definition = getReportDefinition(value);
  if (!definition) throw new Error("Unknown report.");
  return definition.id;
}

export async function exportReport(formData: FormData): Promise<{
  fileName: string;
  base64: string;
  mimeType: string;
}> {
  const ctx = await requireModuleAccess("REPORTS");
  const reportId = parseReportId(String(formData.get("reportId") ?? ""));
  const format = (String(formData.get("format") ?? "xlsx") as ReportExportFormat) || "xlsx";
  const entityId = String(formData.get("entityId") ?? "").trim() || undefined;
  const fromDate = String(formData.get("fromDate") ?? "").trim() || undefined;
  const toDate = String(formData.get("toDate") ?? "").trim() || undefined;

  const result = await generateReport(ctx, reportId, { entityId, fromDate, toDate });
  const dateSuffix = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const csv = reportToCsv(result);
    return encodeCsvExport(csv, `${reportId}-${dateSuffix}.csv`);
  }

  const buffer = reportToWorkbook(result);
  return encodeExport(buffer, `${reportId}-${dateSuffix}.xlsx`);
}

export async function fetchReportPreview(formData: FormData) {
  const ctx = await requireModuleAccess("REPORTS");
  const reportId = parseReportId(String(formData.get("reportId") ?? ""));
  const entityId = String(formData.get("entityId") ?? "").trim() || undefined;
  const fromDate = String(formData.get("fromDate") ?? "").trim() || undefined;
  const toDate = String(formData.get("toDate") ?? "").trim() || undefined;

  return generateReport(ctx, reportId, { entityId, fromDate, toDate });
}
