import { db } from "@/lib/db";
import { ensureContactsSchema } from "@/lib/db/ensure-contacts-schema";
import { buildSystemItem } from "@/lib/calendar/helpers";
import type { CalendarItem } from "@/lib/calendar/types";
import { canAccess } from "@/lib/permissions/access";
import { contactEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";
import { addDays } from "@/lib/calendar/status";
import { CONTACTS_PATH } from "@/lib/contacts/constants";

export async function getContactsCalendarItems(ctx: UserContext): Promise<CalendarItem[]> {
  if (!canAccess(ctx, "CONTACTS")) return [];

  await ensureContactsSchema();

  const now = new Date();
  const horizon = addDays(now, 30);

  const contacts = await db.directoryContact.findMany({
    where: {
      ...contactEntityFilter(ctx),
      isActive: true,
      nextFollowUpDate: { not: null, lte: horizon },
    },
    include: {
      entity: { select: { name: true } },
    },
    take: 50,
    orderBy: { nextFollowUpDate: "asc" },
  });

  return contacts.map((contact) =>
    buildSystemItem({
      id: `system:contact-follow-up:${contact.id}`,
      kind: "CONTACT_FOLLOW_UP",
      module: "CONTACTS",
      title: contact.fullName,
      subtitle: [
        contact.organization,
        contact.entity?.name ? `· ${contact.entity.name}` : null,
        "Follow-up",
      ]
        .filter(Boolean)
        .join(" "),
      date: contact.nextFollowUpDate!,
      href: `${CONTACTS_PATH}/${contact.id}`,
      entityId: contact.entityId,
      entityName: contact.entity?.name ?? null,
    }),
  );
}
