import { db } from "@/lib/db";
import { buildSystemItem } from "@/lib/calendar/helpers";
import type { CalendarItem } from "@/lib/calendar/types";
import { addDays } from "@/lib/calendar/status";
import { canAccess } from "@/lib/permissions/access";
import { rePropertyEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";

export async function getRealEstateCalendarItems(ctx: UserContext): Promise<CalendarItem[]> {
  if (!canAccess(ctx, "REAL_ESTATE")) return [];

  const now = new Date();
  const horizon30 = addDays(now, 30);
  const horizon90 = addDays(now, 90);
  const entityFilter = rePropertyEntityFilter(ctx);

  const properties = await db.reProperty.findMany({
    where: { ...entityFilter, status: { not: "SOLD" } },
    select: {
      id: true,
      name: true,
      entityId: true,
      entity: { select: { name: true } },
    },
    take: 30,
  });

  if (properties.length === 0) return [];

  const propertyIds = properties.map((p) => p.id);
  const propertyById = new Map(properties.map((p) => [p.id, p]));
  const items: CalendarItem[] = [];

  const overdueRent = await db.reRentSchedule.findMany({
    where: {
      unit: { propertyId: { in: propertyIds } },
      paymentStatus: { in: ["OVERDUE", "PARTIALLY_PAID"] },
    },
    include: {
      unit: { select: { propertyId: true, unitNumber: true } },
      lease: { include: { tenant: { select: { fullName: true } } } },
    },
    take: 30,
  });

  for (const row of overdueRent) {
    const property = propertyById.get(row.unit.propertyId);
    if (!property) continue;
    items.push(
      buildSystemItem({
        id: `system:re-rent:${row.id}`,
        kind: "RE_RENT_DUE",
        module: "REAL_ESTATE",
        title: `${property.name} · ${row.unit.unitNumber}`,
        subtitle: `Overdue rent · ${row.lease.tenant.fullName}`,
        date: row.dueDate,
        href: `/real-estate/${property.id}?tab=rent`,
        entityId: property.entityId,
        entityName: property.entity?.name,
      }),
    );
  }

  const expiringLeases = await db.reLease.findMany({
    where: {
      unit: { propertyId: { in: propertyIds } },
      status: "ACTIVE",
      leaseEndDate: { lte: horizon90 },
    },
    include: {
      unit: { select: { propertyId: true, unitNumber: true } },
      tenant: { select: { fullName: true } },
    },
    take: 30,
  });

  for (const lease of expiringLeases) {
    const property = propertyById.get(lease.unit.propertyId);
    if (!property) continue;
    items.push(
      buildSystemItem({
        id: `system:re-lease:${lease.id}`,
        kind: "RE_LEASE_EXPIRY",
        module: "REAL_ESTATE",
        title: `${property.name} · ${lease.unit.unitNumber}`,
        subtitle: `Lease ending · ${lease.tenant.fullName}`,
        date: lease.leaseEndDate,
        href: `/real-estate/${property.id}?tab=leases`,
        entityId: property.entityId,
        entityName: property.entity?.name,
      }),
    );
  }

  const municipalityDue = await db.reLease.findMany({
    where: {
      unit: { propertyId: { in: propertyIds } },
      status: "ACTIVE",
      municipalityExpiryDate: { not: null, lte: horizon30 },
    },
    include: { unit: { select: { propertyId: true, unitNumber: true } } },
    take: 20,
  });

  for (const lease of municipalityDue) {
    const property = propertyById.get(lease.unit.propertyId);
    if (!property || !lease.municipalityExpiryDate) continue;
    items.push(
      buildSystemItem({
        id: `system:re-municipality:${lease.id}`,
        kind: "RE_MUNICIPALITY",
        module: "REAL_ESTATE",
        title: `${property.name} · ${lease.unit.unitNumber}`,
        subtitle: "Municipality registration expiry",
        date: lease.municipalityExpiryDate,
        href: `/real-estate/${property.id}?tab=leases`,
        entityId: property.entityId,
        entityName: property.entity?.name,
      }),
    );
  }

  const expiringDocs = await db.rePropertyDocument.findMany({
    where: {
      propertyId: { in: propertyIds },
      expiryDate: { not: null, lte: horizon30 },
    },
    take: 20,
  });

  for (const doc of expiringDocs) {
    const property = propertyById.get(doc.propertyId);
    if (!property || !doc.expiryDate) continue;
    items.push(
      buildSystemItem({
        id: `system:re-doc:${doc.id}`,
        kind: "RE_DOCUMENT_EXPIRY",
        module: "REAL_ESTATE",
        title: property.name,
        subtitle: `${doc.documentType.replace(/_/g, " ")} expiring`,
        date: doc.expiryDate,
        href: `/real-estate/${property.id}?tab=documents`,
        entityId: property.entityId,
        entityName: property.entity?.name,
      }),
    );
  }

  return items;
}
