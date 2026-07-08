import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { ReportPreview } from "@/components/reports/report-preview";
import { ReportRunner } from "@/components/reports/report-runner";
import { generateReport, listReportEntities } from "@/lib/data/reports";
import { getReportDefinition } from "@/lib/reports/catalog";
import { canRunReport } from "@/lib/reports/access";
import { requireModuleAccess } from "@/lib/permissions/access";
import type { ReportId } from "@/lib/reports/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/format";

export default async function ReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<{ entity?: string; from?: string; to?: string }>;
}) {
  const { reportId: rawReportId } = await params;
  const { entity, from, to } = await searchParams;
  const reportId = rawReportId as ReportId;
  const definition = getReportDefinition(reportId);

  if (!definition) notFound();

  const ctx = await requireModuleAccess("REPORTS");
  if (!canRunReport(ctx, reportId)) notFound();

  const [entities, result] = await Promise.all([
    listReportEntities(ctx),
    generateReport(ctx, reportId, {
      entityId: entity,
      fromDate: from,
      toDate: to,
    }),
  ]);

  const entityId =
    entity && entities.some((item) => item.id === entity) ? entity : entities[0]?.id;

  return (
    <>
      <PlatformHeader title={definition.title} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
          <div className="space-y-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/reports">
                <ArrowLeft className="mr-2 h-4 w-4" />
                All reports
              </Link>
            </Button>
            <div>
              <h2 className="text-lg font-semibold">{definition.title}</h2>
              <p className="text-sm text-muted-foreground">{definition.description}</p>
              <p className="text-xs text-muted-foreground">
                Generated {formatDate(result.generatedAt)}
                {result.entityName ? ` · ${result.entityName}` : ""}
              </p>
            </div>
          </div>
        </div>

        <ReportRunner
          report={definition}
          entities={entities}
          defaultEntityId={entityId}
          defaultFromDate={from}
          defaultToDate={to}
        />

        <ReportPreview result={result} />
      </main>
    </>
  );
}
