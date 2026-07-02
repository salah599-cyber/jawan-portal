"use client";

import { useTransition } from "react";
import { exportReport } from "@/lib/actions/reports";
import type { ReportId } from "@/lib/reports/types";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

function downloadFile(result: { fileName: string; base64: string; mimeType: string }) {
  const bytes = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: result.mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = result.fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function ExportReportButton({
  reportId,
  entityId,
  fromDate,
  toDate,
  format = "xlsx",
  label,
}: {
  reportId: ReportId;
  entityId?: string;
  fromDate?: string;
  toDate?: string;
  format?: "xlsx" | "csv";
  label?: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleExport() {
    const formData = new FormData();
    formData.set("reportId", reportId);
    formData.set("format", format);
    if (entityId) formData.set("entityId", entityId);
    if (fromDate) formData.set("fromDate", fromDate);
    if (toDate) formData.set("toDate", toDate);

    startTransition(async () => {
      const result = await exportReport(formData);
      downloadFile(result);
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={pending}>
      <Download className="mr-2 h-4 w-4" />
      {pending ? "Exporting..." : label ?? (format === "csv" ? "Export CSV" : "Export Excel")}
    </Button>
  );
}
