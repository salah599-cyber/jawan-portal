import { canAccess } from "@/lib/permissions/access";
import { REPORT_CATALOG } from "@/lib/reports/catalog";
import type { ReportId } from "@/lib/reports/types";
import type { UserContext } from "@/lib/permissions/types";

export function canRunReport(ctx: UserContext, reportId: ReportId): boolean {
  if (!canAccess(ctx, "REPORTS")) return false;

  const definition = REPORT_CATALOG.find((report) => report.id === reportId);
  if (!definition) return false;

  return definition.requiredModules.every((module) => canAccess(ctx, module));
}

export function listAccessibleReports(ctx: UserContext) {
  if (!canAccess(ctx, "REPORTS")) return [];
  return REPORT_CATALOG.filter((report) => canRunReport(ctx, report.id));
}
