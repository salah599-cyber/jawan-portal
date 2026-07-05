import { db } from "@/lib/db";
import { toNumber } from "@/lib/real-estate/helpers";

export type ReAlert = {
  id: string;
  type: string;
  severity: "critical" | "warning" | "info";
  propertyId: string;
  propertyName: string;
  unitId?: string;
  unitNumber?: string;
  message: string;
  href: string;
};

const DAY_MS = 1000 * 60 * 60 * 24;

function daysFromNow(date: Date, now: Date) {
  return Math.ceil((date.getTime() - now.getTime()) / DAY_MS);
}

function daysAgo(date: Date, now: Date) {
  return Math.ceil((now.getTime() - date.getTime()) / DAY_MS);
}

export async function getPropertyAlerts(propertyId: string): Promise<ReAlert[]> {
  const now = new Date();
  const horizon30 = new Date(now);
  horizon30.setDate(horizon30.getDate() + 30);
  const horizon7 = new Date(now);
  horizon7.setDate(horizon7.getDate() + 7);
  const horizon90 = new Date(now);
  horizon90.setDate(horizon90.getDate() + 90);

  const property = await db.reProperty.findUnique({
    where: { id: propertyId },
    select: { id: true, name: true, portfolioTrack: true },
  });
  if (!property) return [];
  if (property.portfolioTrack === "PRIVATE") return [];

  const alerts: ReAlert[] = [];
  const baseHref = `/real-estate/${propertyId}`;

  const overdueRent = await db.reRentSchedule.findMany({
    where: {
      unit: { propertyId },
      paymentStatus: { in: ["OVERDUE", "PARTIALLY_PAID"] },
    },
    include: {
      unit: { select: { id: true, unitNumber: true } },
      lease: { include: { tenant: { select: { fullName: true } } } },
    },
    take: 20,
  });

  for (const row of overdueRent) {
    const days = daysAgo(row.dueDate, now);
    alerts.push({
      id: `overdue-rent-${row.id}`,
      type: "OVERDUE_RENT",
      severity: "critical",
      propertyId,
      propertyName: property.name,
      unitId: row.unit.id,
      unitNumber: row.unit.unitNumber,
      message: `${row.unit.unitNumber} — ${row.lease.tenant.fullName} — OMR ${toNumber(row.amountOmr).toFixed(3)} overdue by ${days} days`,
      href: `${baseHref}?tab=rent`,
    });
  }

  const bouncedPdc = await db.reRentSchedule.findMany({
    where: { unit: { propertyId }, pdcStatus: "BOUNCED" },
    include: { unit: { select: { id: true, unitNumber: true } } },
    take: 10,
  });
  for (const row of bouncedPdc) {
    alerts.push({
      id: `bounced-pdc-${row.id}`,
      type: "BOUNCED_CHEQUE",
      severity: "critical",
      propertyId,
      propertyName: property.name,
      unitId: row.unit.id,
      unitNumber: row.unit.unitNumber,
      message: `${row.unit.unitNumber} — Cheque #${row.pdcChequeNumber ?? "—"} from ${row.pdcBank ?? "bank"} bounced`,
      href: `${baseHref}?tab=rent`,
    });
  }

  const activeLeases = await db.reLease.findMany({
    where: { unit: { propertyId }, status: "ACTIVE" },
    include: {
      unit: { select: { id: true, unitNumber: true } },
      tenant: { select: { fullName: true, idExpiryDate: true } },
    },
  });

  for (const lease of activeLeases) {
    const daysLeft = daysFromNow(lease.leaseEndDate, now);
    if (daysLeft > 0 && daysLeft <= 90) {
      alerts.push({
        id: `lease-expiring-${lease.id}`,
        type: "LEASE_EXPIRING",
        severity: daysLeft <= 30 ? "warning" : "info",
        propertyId,
        propertyName: property.name,
        unitId: lease.unit.id,
        unitNumber: lease.unit.unitNumber,
        message: `${lease.unit.unitNumber} — ${lease.tenant.fullName} lease expires in ${daysLeft} days`,
        href: `${baseHref}?tab=leases`,
      });
    }
    if (lease.leaseEndDate < now) {
      alerts.push({
        id: `lease-expired-${lease.id}`,
        type: "LEASE_EXPIRED",
        severity: "critical",
        propertyId,
        propertyName: property.name,
        unitId: lease.unit.id,
        unitNumber: lease.unit.unitNumber,
        message: `${lease.unit.unitNumber} — ${lease.tenant.fullName} lease expired ${daysAgo(lease.leaseEndDate, now)} days ago`,
        href: `${baseHref}?tab=leases`,
      });
    }
    if (lease.municipalityExpiryDate && lease.municipalityExpiryDate <= horizon30) {
      const days = daysFromNow(lease.municipalityExpiryDate, now);
      alerts.push({
        id: `municipality-${lease.id}`,
        type: "MUNICIPALITY_RENEWAL",
        severity: days <= 0 ? "critical" : "warning",
        propertyId,
        propertyName: property.name,
        unitId: lease.unit.id,
        unitNumber: lease.unit.unitNumber,
        message: `Municipality registration for ${lease.unit.unitNumber} ${days <= 0 ? "expired" : `expires in ${days} days`}`,
        href: `${baseHref}?tab=leases`,
      });
    }
    if (lease.tenant.idExpiryDate && lease.tenant.idExpiryDate <= horizon30) {
      const days = daysFromNow(lease.tenant.idExpiryDate, now);
      alerts.push({
        id: `tenant-id-${lease.id}`,
        type: "TENANT_ID_EXPIRING",
        severity: days <= 0 ? "critical" : "warning",
        propertyId,
        propertyName: property.name,
        unitId: lease.unit.id,
        unitNumber: lease.unit.unitNumber,
        message: `${lease.tenant.fullName} ID expires ${days <= 0 ? "today or past" : `in ${days} days`}`,
        href: `${baseHref}?tab=leases`,
      });
    }
  }

  const expiringDocs = await db.rePropertyDocument.findMany({
    where: {
      propertyId,
      expiryDate: { lte: horizon30 },
    },
    take: 10,
  });
  for (const doc of expiringDocs) {
    if (!doc.expiryDate) continue;
    const days = daysFromNow(doc.expiryDate, now);
    alerts.push({
      id: `doc-expiry-${doc.id}`,
      type: days <= 0 ? "DOCUMENT_EXPIRED" : "DOCUMENT_EXPIRING",
      severity: days <= 0 ? "critical" : "warning",
      propertyId,
      propertyName: property.name,
      message: `${doc.documentType.replace(/_/g, " ")} ${days <= 0 ? "expired" : `expires in ${days} days`}`,
      href: `${baseHref}?tab=documents`,
    });
  }

  const vacantUnits = await db.reUnit.findMany({
    where: { propertyId, occupancyStatus: "VACANT" },
    select: { id: true, unitNumber: true, vacantSince: true },
  });
  for (const unit of vacantUnits) {
    if (!unit.vacantSince) continue;
    const days = daysAgo(unit.vacantSince, now);
    if (days > 60) {
      alerts.push({
        id: `low-occupancy-${unit.id}`,
        type: "LOW_OCCUPANCY",
        severity: "warning",
        propertyId,
        propertyName: property.name,
        unitId: unit.id,
        unitNumber: unit.unitNumber,
        message: `${unit.unitNumber} vacant for ${days} days`,
        href: `${baseHref}?tab=units`,
      });
    }
  }

  const openMaintenance = await db.reMaintenanceRequest.findMany({
    where: { propertyId, status: { in: ["OPEN", "IN_PROGRESS", "PENDING_PARTS"] } },
    include: { unit: { select: { id: true, unitNumber: true } } },
  });
  for (const req of openMaintenance) {
    const days = daysAgo(req.reportedDate, now);
    const threshold = req.priority === "URGENT" ? 7 : 30;
    if (days > threshold) {
      alerts.push({
        id: `maintenance-${req.id}`,
        type: "MAINTENANCE_OVERDUE",
        severity: req.priority === "URGENT" ? "critical" : "warning",
        propertyId,
        propertyName: property.name,
        unitId: req.unit?.id,
        unitNumber: req.unit?.unitNumber,
        message: `${req.unit?.unitNumber ?? "Property"} — ${req.category} open for ${days} days`,
        href: `${baseHref}?tab=maintenance`,
      });
    }
  }

  const pdcDue = await db.reRentSchedule.findMany({
    where: {
      unit: { propertyId },
      pdcStatus: "PENDING",
      dueDate: { lte: horizon7, gte: now },
    },
    include: {
      unit: { select: { id: true, unitNumber: true } },
      lease: { include: { tenant: { select: { fullName: true } } } },
    },
  });
  for (const row of pdcDue) {
    const days = daysFromNow(row.dueDate, now);
    alerts.push({
      id: `pdc-due-${row.id}`,
      type: "PDC_DUE",
      severity: "info",
      propertyId,
      propertyName: property.name,
      unitId: row.unit.id,
      unitNumber: row.unit.unitNumber,
      message: `${row.unit.unitNumber} — ${row.lease.tenant.fullName} cheque #${row.pdcChequeNumber ?? "—"} due in ${days} days`,
      href: `${baseHref}?tab=rent`,
    });
  }

  const severityOrder = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

export async function getPortfolioAlerts(entityFilter: { entityId?: { in: string[] } }) {
  const properties = await db.reProperty.findMany({
    where: { ...entityFilter, portfolioTrack: "INVESTMENT", status: { not: "SOLD" } },
    select: { id: true },
  });
  const all: ReAlert[] = [];
  for (const property of properties) {
    const alerts = await getPropertyAlerts(property.id);
    all.push(...alerts);
  }
  return all.slice(0, 50);
}
