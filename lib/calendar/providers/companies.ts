import { db } from "@/lib/db";
import { buildSystemItem } from "@/lib/calendar/helpers";
import type { CalendarItem } from "@/lib/calendar/types";
import { addDays } from "@/lib/calendar/status";
import { canAccess } from "@/lib/permissions/access";
import { companyEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";

export async function getCompanyCalendarItems(ctx: UserContext): Promise<CalendarItem[]> {
  if (!canAccess(ctx, "COMPANIES")) return [];

  const now = new Date();
  const horizon = addDays(now, 30);

  const companies = await db.registeredCompany.findMany({
    where: companyEntityFilter(ctx),
    select: {
      id: true,
      name: true,
      registrationNumber: true,
      registrationExpiryDate: true,
      entityId: true,
      entity: { select: { name: true } },
    },
    take: 50,
  });

  return companies
    .filter((company) => company.registrationExpiryDate && company.registrationExpiryDate <= horizon)
    .map((company) =>
      buildSystemItem({
        id: `system:company:${company.id}`,
        kind: "COMPANY_REGISTRATION",
        module: "COMPANIES",
        title: company.name,
        subtitle: `Registration expiry · ${company.registrationNumber}`,
        date: company.registrationExpiryDate!,
        href: `/companies/${company.id}`,
        entityId: company.entityId,
        entityName: company.entity?.name,
      }),
    );
}
