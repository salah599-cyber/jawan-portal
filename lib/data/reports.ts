import { db } from "@/lib/db";
import { ensureDefaultEntity } from "@/lib/data/entities";
import { listAccessibleReports } from "@/lib/reports/access";
import { REPORT_CATEGORY_LABELS } from "@/lib/reports/catalog";
import { reportsEntityFilter } from "@/lib/permissions/scoped-queries";
import { runReport } from "@/lib/reports/run";
import type { ReportId, ReportParams, ReportResult } from "@/lib/reports/types";
import type { UserContext } from "@/lib/permissions/types";

export async function listReportEntities(ctx: UserContext) {
  await ensureDefaultEntity();
  const filter = reportsEntityFilter(ctx);

  return db.entity.findMany({
    where: filter,
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function getReportsCatalog(ctx: UserContext) {
  const reports = listAccessibleReports(ctx);
  const grouped = new Map<string, typeof reports>();

  for (const report of reports) {
    const items = grouped.get(report.category) ?? [];
    items.push(report);
    grouped.set(report.category, items);
  }

  return [...grouped.entries()].map(([category, items]) => ({
    category,
    label: REPORT_CATEGORY_LABELS[category] ?? category,
    reports: items,
  }));
}

export async function generateReport(
  ctx: UserContext,
  reportId: ReportId,
  params: ReportParams = {},
): Promise<ReportResult> {
  return runReport(ctx, reportId, params);
}
