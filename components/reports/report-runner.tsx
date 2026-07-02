"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReportDefinition } from "@/lib/reports/types";
import { ReportFilters } from "@/components/reports/report-filters";
import { ExportReportButton } from "@/components/reports/export-report-button";
import { PrintReportButton } from "@/components/reports/print-report-button";
import type { EntityOption } from "@/components/platform/entity-select";
import { Button } from "@/components/ui/button";

export function ReportRunner({
  report,
  entities,
  defaultEntityId,
  defaultFromDate,
  defaultToDate,
}: {
  report: ReportDefinition;
  entities: EntityOption[];
  defaultEntityId?: string;
  defaultFromDate?: string;
  defaultToDate?: string;
}) {
  const router = useRouter();
  const [entityId, setEntityId] = useState(defaultEntityId ?? entities[0]?.id ?? "");
  const [fromDate, setFromDate] = useState(defaultFromDate ?? "");
  const [toDate, setToDate] = useState(defaultToDate ?? "");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (entityId) params.set("entity", entityId);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    return params.toString();
  }, [entityId, fromDate, toDate]);

  function applyFilters() {
    router.push(`/reports/${report.id}${query ? `?${query}` : ""}`);
  }

  return (
    <div className="space-y-4 rounded-lg border p-4 print:hidden">
      <ReportFilters
        report={report}
        entities={entities}
        entityId={entityId}
        fromDate={fromDate}
        toDate={toDate}
        onEntityChange={setEntityId}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={applyFilters}>
          Apply filters
        </Button>
        <ExportReportButton
          reportId={report.id}
          entityId={entityId || undefined}
          fromDate={fromDate || undefined}
          toDate={toDate || undefined}
        />
        <ExportReportButton
          reportId={report.id}
          entityId={entityId || undefined}
          fromDate={fromDate || undefined}
          toDate={toDate || undefined}
          format="csv"
        />
        <PrintReportButton />
      </div>
    </div>
  );
}
