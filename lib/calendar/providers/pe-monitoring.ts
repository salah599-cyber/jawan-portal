import { db } from "@/lib/db";
import { ensurePeSchema } from "@/lib/db/ensure-pe-schema";
import { buildSystemItem } from "@/lib/calendar/helpers";
import type { CalendarItem } from "@/lib/calendar/types";
import { addDays } from "@/lib/calendar/status";
import { canAccess } from "@/lib/permissions/access";
import { peCompanyEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";
import type { PeReportType } from "@/lib/generated/prisma/client";

function nextReportDueDate(reportDate: Date, reportType: PeReportType): Date {
  const next = new Date(reportDate);
  switch (reportType) {
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    case "QUARTERLY":
      next.setMonth(next.getMonth() + 3);
      break;
    case "ANNUAL":
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 3);
      break;
  }
  return next;
}

export async function getPeMonitoringCalendarItems(ctx: UserContext): Promise<CalendarItem[]> {
  if (!canAccess(ctx, "PRIVATE_EQUITY")) return [];

  try {
    await ensurePeSchema();
  } catch {
    return [];
  }

  const now = new Date();
  const horizon = addDays(now, 30);

  const companies = await db.peCompany.findMany({
    where: {
      ...peCompanyEntityFilter(ctx),
      status: { in: ["ACTIVE", "FOLLOW_ON_PENDING", "WATCHLIST"] },
    },
    select: {
      id: true,
      name: true,
      entityId: true,
      entity: { select: { name: true } },
      monitoringReports: {
        orderBy: { reportDate: "desc" },
        take: 1,
        select: { reportDate: true, reportType: true },
      },
    },
    take: 50,
  });

  const items: CalendarItem[] = [];

  for (const company of companies) {
    const latest = company.monitoringReports[0];
    if (!latest) continue;

    const dueDate = nextReportDueDate(latest.reportDate, latest.reportType);
    if (dueDate > horizon) continue;

    items.push(
      buildSystemItem({
        id: `system:pe-monitoring:${company.id}`,
        kind: "PE_MONITORING_DUE",
        module: "PRIVATE_EQUITY",
        title: company.name,
        subtitle: `${latest.reportType.replace(/_/g, " ").toLowerCase()} monitoring report due`,
        date: dueDate,
        href: `/portfolio/pe/${company.id}`,
        entityId: company.entityId,
        entityName: company.entity?.name,
      }),
    );
  }

  return items;
}
