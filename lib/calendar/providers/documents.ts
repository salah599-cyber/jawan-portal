import { db } from "@/lib/db";
import { buildSystemItem } from "@/lib/calendar/helpers";
import type { CalendarItem } from "@/lib/calendar/types";
import { daysUntil } from "@/lib/calendar/status";
import { canAccess } from "@/lib/permissions/access";
import { documentFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";

export async function getDocumentCalendarItems(ctx: UserContext): Promise<CalendarItem[]> {
  if (!canAccess(ctx, "DOCUMENTS")) return [];

  const documents = await db.document.findMany({
    where: documentFilter(ctx),
    select: {
      id: true,
      name: true,
      status: true,
      expiryDate: true,
      entityId: true,
      entity: { select: { name: true } },
    },
    take: 100,
  });

  const expiring = documents.filter(
    (doc) =>
      doc.expiryDate &&
      (doc.status === "EXPIRING_SOON" ||
        doc.status === "EXPIRED" ||
        daysUntil(doc.expiryDate) <= 30),
  );

  return expiring.map((doc) =>
    buildSystemItem({
      id: `system:document:${doc.id}`,
      kind: "DOCUMENT_EXPIRY",
      module: "DOCUMENTS",
      title: doc.name,
      subtitle: doc.status === "EXPIRED" ? "Expired document" : "Document expiring soon",
      date: doc.expiryDate!,
      href: `/documents/${doc.id}/edit`,
      entityId: doc.entityId,
      entityName: doc.entity?.name,
    }),
  );
}
