import { db } from "@/lib/db";
import { ensureFamilySchema } from "@/lib/db/ensure-family-schema";
import { buildSystemItem } from "@/lib/calendar/helpers";
import type { CalendarItem } from "@/lib/calendar/types";
import { canAccess } from "@/lib/permissions/access";
import { familyMemberFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";
import { addDays } from "@/lib/calendar/status";
import { FAMILY_MEMBERS_PATH } from "@/lib/family/constants";
import { isExpiringWithinDays } from "@/lib/family/helpers";

export async function getFamilyKycCalendarItems(ctx: UserContext): Promise<CalendarItem[]> {
  if (!canAccess(ctx, "FAMILY_MEMBERS")) return [];

  await ensureFamilySchema();

  const now = new Date();
  const horizon = addDays(now, 30);

  const members = await db.familyMember.findMany({
    where: {
      ...familyMemberFilter(ctx),
      deceased: false,
      OR: [
        { idExpiryDate: { not: null, lte: horizon } },
        {
          documents: {
            some: {
              expiryDate: { not: null, lte: horizon },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      fullName: true,
      idExpiryDate: true,
      documents: {
        where: { expiryDate: { not: null, lte: horizon } },
        select: { id: true, documentType: true, expiryDate: true },
        take: 3,
      },
    },
    take: 50,
    orderBy: { idExpiryDate: "asc" },
  });

  const items: CalendarItem[] = [];

  for (const member of members) {
    if (member.idExpiryDate && member.idExpiryDate <= horizon) {
      items.push(
        buildSystemItem({
          id: `system:family-kyc-id:${member.id}`,
          kind: "FAMILY_KYC_EXPIRY",
          module: "FAMILY_MEMBERS",
          title: member.fullName,
          subtitle: "ID document expiry",
          date: member.idExpiryDate,
          href: `${FAMILY_MEMBERS_PATH}/${member.id}`,
        }),
      );
    }

    for (const doc of member.documents) {
      if (!doc.expiryDate || doc.expiryDate > horizon) continue;
      items.push(
        buildSystemItem({
          id: `system:family-kyc-doc:${doc.id}`,
          kind: "FAMILY_KYC_EXPIRY",
          module: "FAMILY_MEMBERS",
          title: member.fullName,
          subtitle: `KYC document expiry · ${doc.documentType}`,
          date: doc.expiryDate,
          href: `${FAMILY_MEMBERS_PATH}/${member.id}`,
        }),
      );
    }
  }

  return items;
}
