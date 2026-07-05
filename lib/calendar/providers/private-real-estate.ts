import { addDays } from "@/lib/calendar/status";
import { buildSystemItem } from "@/lib/calendar/helpers";
import type { CalendarItem } from "@/lib/calendar/types";
import { db } from "@/lib/db";
import { canAccess } from "@/lib/permissions/access";
import { rePropertyEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";
import { PRIVATE_RE_PATH } from "@/lib/real-estate/private-constants";

const HORIZON_DAYS = 90;

export async function getPrivateRealEstateCalendarItems(ctx: UserContext): Promise<CalendarItem[]> {
  if (!canAccess(ctx, "REAL_ESTATE")) return [];

  const horizon = addDays(new Date(), HORIZON_DAYS);
  const now = new Date();

  const staff = await db.rePrivateStaff.findMany({
    where: {
      property: {
        portfolioTrack: "PRIVATE",
        ...rePropertyEntityFilter(ctx),
      },
      OR: [
        { visaExpiry: { gte: now, lte: horizon } },
        { contractExpiry: { gte: now, lte: horizon } },
      ],
    },
    include: {
      property: { select: { id: true, name: true, entityId: true } },
    },
  });

  const items: CalendarItem[] = [];

  for (const member of staff) {
    if (member.visaExpiry && member.visaExpiry >= now && member.visaExpiry <= horizon) {
      items.push(
        buildSystemItem({
          id: `private-re-visa-${member.id}`,
          kind: "RE_STAFF_VISA_EXPIRY",
          module: "REAL_ESTATE",
          title: `${member.fullName} — visa expiry`,
          subtitle: member.property.name,
          date: member.visaExpiry,
          href: `${PRIVATE_RE_PATH}/${member.property.id}?tab=staff`,
          entityId: member.property.entityId,
        }),
      );
    }

    if (member.contractExpiry && member.contractExpiry >= now && member.contractExpiry <= horizon) {
      items.push(
        buildSystemItem({
          id: `private-re-contract-${member.id}`,
          kind: "RE_STAFF_CONTRACT_EXPIRY",
          module: "REAL_ESTATE",
          title: `${member.fullName} — contract expiry`,
          subtitle: member.property.name,
          date: member.contractExpiry,
          href: `${PRIVATE_RE_PATH}/${member.property.id}?tab=staff`,
          entityId: member.property.entityId,
        }),
      );
    }
  }

  return items;
}
