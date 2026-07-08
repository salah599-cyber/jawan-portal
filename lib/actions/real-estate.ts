"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ensureRealEstateSchema } from "@/lib/db/ensure-real-estate-schema";
import { deleteBlobUrl } from "@/lib/blob";
import { logAudit } from "@/lib/audit/log";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { rePropertyEntityFilter } from "@/lib/permissions/scoped-queries";
import {
  syncRePropertyAsset,
  updatePropertyUnitCount,
  RE_PATH,
} from "@/lib/real-estate/asset-sync";
import {
  generateRentScheduleForLease,
  computeLeaseDurationMonths,
  refreshRentScheduleStatuses,
  type PdcChequeEntry,
} from "@/lib/real-estate/rent-schedule";
import {
  syncMaintenanceExpenseRecord,
} from "@/lib/real-estate/maintenance-expense-sync";
import {
  parseDecimalInput,
  parseDateInput,
  parseIntInput,
  addMonths,
  frequencyMonths,
  startOfMonth,
  formatPeriodLabel,
} from "@/lib/real-estate/helpers";
import { DEFAULT_NOTICE_PERIOD_DAYS } from "@/lib/real-estate/constants";
import type {
  ReExpensePaymentStatus,
  ReFurnishingStatus,
  ReLeaseStatus,
  ReMaintenanceCategory,
  ReMaintenanceChargedTo,
  ReMaintenancePriority,
  ReMaintenanceReportedBy,
  ReMaintenanceStatus,
  ReOccupancyStatus,
  ReOwnershipStatus,
  RePaymentFrequency,
  RePaymentMethod,
  RePropertyDocumentType,
  RePropertyExpenseCategory,
  RePropertyStatus,
  RePropertyType,
  ReRecurrenceFrequency,
  ReRentPaymentStatus,
  ReTenantIdType,
  ReUnitType,
  ReUtilityPaymentStatus,
  ReUtilityType,
  ReValuationMethod,
} from "@/lib/generated/prisma/client";

export type ReUnitInput = {
  unitNumber: string;
  unitType: ReUnitType;
  floorNumber?: number;
  areaSqm?: string;
  numBedrooms?: number;
  numBathrooms?: number;
  numParkingSpaces?: number;
  electricityMeterNumber?: string;
  electricityAccountNumber?: string;
  electricityProvider?: string;
  waterMeterNumber?: string;
  waterAccountNumber?: string;
  waterProvider?: string;
  furnishingStatus?: ReFurnishingStatus;
  marketRentOmr?: string;
  notes?: string;
};

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getFilesFromFormData(formData: FormData, field: string): File[] {
  return formData
    .getAll(field)
    .filter((item): item is File => item instanceof File && item.size > 0);
}

function assertEntityAccess(
  ctx: Awaited<ReturnType<typeof requireModuleAccess>>,
  entityId: string,
) {
  if (ctx.entityIds.length > 0 && !ctx.entityIds.includes(entityId)) {
    if (ctx.role !== "PRINCIPAL" && !ctx.isSuperAdmin) {
      throw new Error("You do not have access to this entity.");
    }
  }
}

function revalidateRealEstate(propertyId?: string) {
  revalidatePath(RE_PATH);
  revalidatePath(`${RE_PATH}/rent`);
  if (propertyId) {
    revalidatePath(`${RE_PATH}/${propertyId}`);
  }
}

async function requireReWrite() {
  await ensureRealEstateSchema();
  const ctx = await requireModuleAccess("REAL_ESTATE");
  if (!canWrite(ctx, "REAL_ESTATE")) {
    throw new Error("You do not have permission to modify real estate records.");
  }
  return ctx;
}

async function requireReRead() {
  await ensureRealEstateSchema();
  return requireModuleAccess("REAL_ESTATE");
}

function parseUnitsJson(raw: string): ReUnitInput[] {
  if (!raw.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid units data.");
  }
  if (!Array.isArray(parsed)) throw new Error("Units must be a list.");

  const units: ReUnitInput[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const unitNumber = String(record.unitNumber ?? "").trim();
    const unitType = String(record.unitType ?? "").trim() as ReUnitType;
    if (!unitNumber || !unitType) continue;
    units.push({
      unitNumber,
      unitType,
      floorNumber: parseIntInput(String(record.floorNumber ?? "")),
      areaSqm: parseDecimalInput(String(record.areaSqm ?? "")),
      numBedrooms: parseIntInput(String(record.numBedrooms ?? "")),
      numBathrooms: parseIntInput(String(record.numBathrooms ?? "")),
      numParkingSpaces: parseIntInput(String(record.numParkingSpaces ?? "")),
      electricityMeterNumber:
        String(record.electricityMeterNumber ?? "").trim() || undefined,
      electricityAccountNumber:
        String(record.electricityAccountNumber ?? "").trim() || undefined,
      electricityProvider: String(record.electricityProvider ?? "").trim() || undefined,
      waterMeterNumber: String(record.waterMeterNumber ?? "").trim() || undefined,
      waterAccountNumber: String(record.waterAccountNumber ?? "").trim() || undefined,
      waterProvider: String(record.waterProvider ?? "").trim() || undefined,
      furnishingStatus:
        (String(record.furnishingStatus ?? "").trim() as ReFurnishingStatus) || undefined,
      marketRentOmr: parseDecimalInput(String(record.marketRentOmr ?? "")),
      notes: String(record.notes ?? "").trim() || undefined,
    });
  }
  return units;
}

function parsePdcChequeNumbers(raw: string): PdcChequeEntry[] | undefined {
  if (!raw.trim()) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid PDC cheque data.");
  }
  if (!Array.isArray(parsed)) throw new Error("PDC cheques must be a list.");
  return parsed as PdcChequeEntry[];
}

function readPropertyFieldsFromForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const propertyType = String(formData.get("propertyType") ?? "").trim() as RePropertyType;
  const entityId = String(formData.get("entityId") ?? "").trim();

  if (!name) throw new Error("Property name is required.");
  if (!propertyType) throw new Error("Property type is required.");
  if (!entityId) throw new Error("Entity is required.");

  return {
    name,
    propertyType,
    entityId,
    ownershipStatus:
      (String(formData.get("ownershipStatus") ?? "OWNED").trim() as ReOwnershipStatus) ||
      "OWNED",
    landParcelId: String(formData.get("landParcelId") ?? "").trim() || undefined,
    purchaseDate: parseDateInput(String(formData.get("purchaseDate") ?? "")),
    purchasePriceOmr: parseDecimalInput(String(formData.get("purchasePriceOmr") ?? "")),
    currentValuationOmr: parseDecimalInput(String(formData.get("currentValuationOmr") ?? "")),
    lastValuationDate: parseDateInput(String(formData.get("lastValuationDate") ?? "")),
    valuationMethod:
      (String(formData.get("valuationMethod") ?? "").trim() as ReValuationMethod) || undefined,
    governorate: String(formData.get("governorate") ?? "").trim() || undefined,
    wilayat: String(formData.get("wilayat") ?? "").trim() || undefined,
    area: String(formData.get("area") ?? "").trim() || undefined,
    streetAddress: String(formData.get("streetAddress") ?? "").trim() || undefined,
    plotNumber: String(formData.get("plotNumber") ?? "").trim() || undefined,
    parcelNumber: String(formData.get("parcelNumber") ?? "").trim() || undefined,
    gpsLat: parseDecimalInput(String(formData.get("gpsLat") ?? "")),
    gpsLng: parseDecimalInput(String(formData.get("gpsLng") ?? "")),
    googleMapsUrl: String(formData.get("googleMapsUrl") ?? "").trim() || undefined,
    landAreaSqm: parseDecimalInput(String(formData.get("landAreaSqm") ?? "")),
    builtUpAreaSqm: parseDecimalInput(String(formData.get("builtUpAreaSqm") ?? "")),
    numFloors: parseIntInput(String(formData.get("numFloors") ?? "")),
    yearBuilt: parseIntInput(String(formData.get("yearBuilt") ?? "")),
    mortgageBank: String(formData.get("mortgageBank") ?? "").trim() || undefined,
    mortgageOutstandingOmr: parseDecimalInput(
      String(formData.get("mortgageOutstandingOmr") ?? ""),
    ),
    mortgageMonthlyPaymentOmr: parseDecimalInput(
      String(formData.get("mortgageMonthlyPaymentOmr") ?? ""),
    ),
    mortgageEndDate: parseDateInput(String(formData.get("mortgageEndDate") ?? "")),
    status: (String(formData.get("status") ?? "ACTIVE").trim() as RePropertyStatus) || "ACTIVE",
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  };
}

function readUnitFieldsFromForm(formData: FormData) {
  const unitNumber = String(formData.get("unitNumber") ?? "").trim();
  const unitType = String(formData.get("unitType") ?? "").trim() as ReUnitType;
  if (!unitNumber) throw new Error("Unit number is required.");
  if (!unitType) throw new Error("Unit type is required.");

  return {
    unitNumber,
    unitType,
    floorNumber: parseIntInput(String(formData.get("floorNumber") ?? "")),
    areaSqm: parseDecimalInput(String(formData.get("areaSqm") ?? "")),
    numBedrooms: parseIntInput(String(formData.get("numBedrooms") ?? "")),
    numBathrooms: parseIntInput(String(formData.get("numBathrooms") ?? "")),
    numParkingSpaces: parseIntInput(String(formData.get("numParkingSpaces") ?? "")),
    electricityMeterNumber:
      String(formData.get("electricityMeterNumber") ?? "").trim() || undefined,
    electricityAccountNumber:
      String(formData.get("electricityAccountNumber") ?? "").trim() || undefined,
    electricityProvider: String(formData.get("electricityProvider") ?? "").trim() || undefined,
    waterMeterNumber: String(formData.get("waterMeterNumber") ?? "").trim() || undefined,
    waterAccountNumber: String(formData.get("waterAccountNumber") ?? "").trim() || undefined,
    waterProvider: String(formData.get("waterProvider") ?? "").trim() || undefined,
    occupancyStatus:
      (String(formData.get("occupancyStatus") ?? "").trim() as ReOccupancyStatus) || undefined,
    furnishingStatus:
      (String(formData.get("furnishingStatus") ?? "").trim() as ReFurnishingStatus) || undefined,
    marketRentOmr: parseDecimalInput(String(formData.get("marketRentOmr") ?? "")),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  };
}

function readTenantFieldsFromForm(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!fullName) throw new Error("Tenant full name is required.");

  return {
    fullName,
    nationality: String(formData.get("nationality") ?? "").trim() || undefined,
    idType: (String(formData.get("idType") ?? "").trim() as ReTenantIdType) || undefined,
    idNumber: String(formData.get("idNumber") ?? "").trim() || undefined,
    idExpiryDate: parseDateInput(String(formData.get("idExpiryDate") ?? "")),
    phonePrimary: String(formData.get("phonePrimary") ?? "").trim() || undefined,
    phoneSecondary: String(formData.get("phoneSecondary") ?? "").trim() || undefined,
    email: String(formData.get("email") ?? "").trim() || undefined,
    employerName: String(formData.get("employerName") ?? "").trim() || undefined,
    emergencyContactName:
      String(formData.get("emergencyContactName") ?? "").trim() || undefined,
    emergencyContactPhone:
      String(formData.get("emergencyContactPhone") ?? "").trim() || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  };
}

function readLeaseFieldsFromForm(formData: FormData) {
  const unitId = String(formData.get("unitId") ?? "").trim();
  const leaseStartDate = parseDateInput(String(formData.get("leaseStartDate") ?? ""));
  const leaseEndDate = parseDateInput(String(formData.get("leaseEndDate") ?? ""));
  const rentAmountOmr = parseDecimalInput(String(formData.get("rentAmountOmr") ?? ""));

  if (!unitId) throw new Error("Unit is required.");
  if (!leaseStartDate) throw new Error("Lease start date is required.");
  if (!leaseEndDate) throw new Error("Lease end date is required.");
  if (!rentAmountOmr) throw new Error("Rent amount is required.");
  if (leaseEndDate < leaseStartDate) {
    throw new Error("Lease end date must be on or after the start date.");
  }

  const noticePeriodDays =
    parseIntInput(String(formData.get("noticePeriodDays") ?? "")) ??
    DEFAULT_NOTICE_PERIOD_DAYS;

  return {
    unitId,
    tenantId: String(formData.get("tenantId") ?? "").trim() || undefined,
    leaseStartDate,
    leaseEndDate,
    rentAmountOmr,
    noticePeriodDays,
    autoRenew: String(formData.get("autoRenew") ?? "") === "true",
    paymentFrequency:
      (String(formData.get("paymentFrequency") ?? "MONTHLY").trim() as RePaymentFrequency) ||
      "MONTHLY",
    paymentMethod:
      (String(formData.get("paymentMethod") ?? "BANK_TRANSFER").trim() as RePaymentMethod) ||
      "BANK_TRANSFER",
    securityDepositOmr: parseDecimalInput(String(formData.get("securityDepositOmr") ?? "")),
    securityDepositPaid: String(formData.get("securityDepositPaid") ?? "") === "true",
    pdcBank: String(formData.get("pdcBank") ?? "").trim() || undefined,
    pdcChequeNumbers: parsePdcChequeNumbers(String(formData.get("pdcChequeNumbers") ?? "")),
    municipalityRegistrationNumber:
      String(formData.get("municipalityRegistrationNumber") ?? "").trim() || undefined,
    municipalityRegistrationDate: parseDateInput(
      String(formData.get("municipalityRegistrationDate") ?? ""),
    ),
    municipalityExpiryDate: parseDateInput(
      String(formData.get("municipalityExpiryDate") ?? ""),
    ),
    legalReference: String(formData.get("legalReference") ?? "").trim() || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  };
}

async function findProperty(propertyId: string, ctx: Awaited<ReturnType<typeof requireReRead>>) {
  const property = await db.reProperty.findFirst({
    where: { id: propertyId, ...rePropertyEntityFilter(ctx) },
  });
  if (!property) throw new Error("Property not found.");
  return property;
}

async function findUnit(unitId: string, ctx: Awaited<ReturnType<typeof requireReRead>>) {
  const unit = await db.reUnit.findFirst({
    where: { id: unitId, property: rePropertyEntityFilter(ctx) },
    include: { property: true },
  });
  if (!unit) throw new Error("Unit not found.");
  return unit;
}

async function findTenant(tenantId: string, ctx: Awaited<ReturnType<typeof requireReRead>>) {
  const tenant = await db.reTenant.findFirst({
    where: { id: tenantId, unit: { property: rePropertyEntityFilter(ctx) } },
    include: { unit: { include: { property: true } } },
  });
  if (!tenant) throw new Error("Tenant not found.");
  return tenant;
}

async function findLease(leaseId: string, ctx: Awaited<ReturnType<typeof requireReRead>>) {
  const lease = await db.reLease.findFirst({
    where: { id: leaseId, unit: { property: rePropertyEntityFilter(ctx) } },
    include: {
      unit: { include: { property: true } },
      tenant: true,
    },
  });
  if (!lease) throw new Error("Lease not found.");
  return lease;
}

async function findRentSchedule(
  scheduleId: string,
  ctx: Awaited<ReturnType<typeof requireReRead>>,
) {
  const schedule = await db.reRentSchedule.findFirst({
    where: { id: scheduleId, unit: { property: rePropertyEntityFilter(ctx) } },
    include: {
      unit: { include: { property: true } },
      lease: true,
    },
  });
  if (!schedule) throw new Error("Rent schedule entry not found.");
  return schedule;
}

async function createRentScheduleEntries(
  leaseId: string,
  unitId: string,
  lease: Parameters<typeof generateRentScheduleForLease>[0],
) {
  const entries = generateRentScheduleForLease(lease);
  if (entries.length === 0) return;

  await db.reRentSchedule.createMany({
    data: entries.map((entry) => ({
      leaseId,
      unitId,
      dueDate: entry.dueDate,
      amountOmr: entry.amountOmr,
      periodLabel: entry.periodLabel,
      pdcChequeNumber: entry.pdcChequeNumber,
      pdcBank: entry.pdcBank,
      pdcStatus: entry.pdcStatus,
      paymentStatus: "PENDING" as ReRentPaymentStatus,
    })),
  });
}

async function appendMissingFutureRentSchedules(
  lease: {
    id: string;
    unitId: string;
    leaseStartDate: Date;
    leaseEndDate: Date;
    rentAmountOmr: { toString(): string };
    paymentFrequency: RePaymentFrequency;
    paymentMethod: RePaymentMethod;
    pdcBank?: string | null;
    pdcChequeNumbers?: unknown;
  },
  now = new Date(),
) {
  const existing = await db.reRentSchedule.findMany({
    where: { leaseId: lease.id },
    orderBy: { dueDate: "desc" },
  });

  const hasFuture = existing.some((row) => row.dueDate > now);
  if (hasFuture) return 0;

  if (existing.length === 0) {
    await createRentScheduleEntries(lease.id, lease.unitId, lease);
    return generateRentScheduleForLease(lease).length;
  }

  const lastDueDate = existing[0]!.dueDate;
  if (lastDueDate >= lease.leaseEndDate) return 0;

  const stepMonths = frequencyMonths(lease.paymentFrequency);
  let cursor = addMonths(startOfMonth(lastDueDate), stepMonths);
  const end = new Date(lease.leaseEndDate);
  const rentAmount = lease.rentAmountOmr.toString();
  const pdcList = Array.isArray(lease.pdcChequeNumbers)
    ? (lease.pdcChequeNumbers as PdcChequeEntry[])
    : [];
  let pdcIndex = existing.filter((row) => row.pdcChequeNumber).length;
  const toCreate = [];

  while (cursor <= end) {
    const dueDate = new Date(cursor);
    const pdc = pdcList[pdcIndex];
    toCreate.push({
      leaseId: lease.id,
      unitId: lease.unitId,
      dueDate,
      amountOmr: rentAmount,
      periodLabel: formatPeriodLabel(dueDate, lease.paymentFrequency),
      paymentStatus: "PENDING" as ReRentPaymentStatus,
      ...(lease.paymentMethod === "PDC"
        ? {
            pdcChequeNumber: pdc?.chequeNumber,
            pdcBank: pdc?.bank ?? lease.pdcBank ?? undefined,
            pdcStatus: "PENDING" as const,
          }
        : {}),
    });
    cursor = addMonths(cursor, stepMonths);
    pdcIndex += 1;
  }

  if (toCreate.length === 0) return 0;
  await db.reRentSchedule.createMany({ data: toCreate });
  return toCreate.length;
}

async function uploadPropertyFiles(
  propertyId: string,
  files: File[],
  documentType: RePropertyDocumentType,
  uploadedById: string,
  options?: {
    unitId?: string;
    leaseId?: string;
    maintenanceRequestId?: string;
    expiryDate?: Date;
    notes?: string;
  },
) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not configured. Document uploads require Vercel Blob storage.",
    );
  }

  const created = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!(file instanceof File) || file.size === 0) continue;

    const pathname =
      "real-estate/" +
      propertyId +
      "/" +
      documentType.toLowerCase() +
      "/" +
      Date.now() +
      "-" +
      i +
      "-" +
      sanitizeFileName(file.name);

    const blob = await put(pathname, file, {
      access: "public",
      token,
      contentType: file.type || undefined,
    });

    const doc = await db.rePropertyDocument.create({
      data: {
        propertyId,
        documentType,
        fileName: file.name,
        fileUrl: blob.url,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        uploadedById,
        unitId: options?.unitId,
        leaseId: options?.leaseId,
        maintenanceRequestId: options?.maintenanceRequestId,
        expiryDate: options?.expiryDate,
        notes: options?.notes,
      },
    });
    created.push(doc);
  }
  return created;
}

async function setUnitVacant(unitId: string) {
  await db.reUnit.update({
    where: { id: unitId },
    data: {
      occupancyStatus: "VACANT",
      vacantSince: new Date(),
    },
  });
}

async function setUnitRented(unitId: string) {
  await db.reUnit.update({
    where: { id: unitId },
    data: {
      occupancyStatus: "RENTED",
      vacantSince: null,
    },
  });
}

// ─── Properties ───────────────────────────────────────────────────────────────

export async function createProperty(formData: FormData) {
  const ctx = await requireReWrite();
  const fields = readPropertyFieldsFromForm(formData);
  assertEntityAccess(ctx, fields.entityId);

  const units = parseUnitsJson(String(formData.get("unitsJson") ?? ""));

  const property = await db.reProperty.create({
    data: {
      ...fields,
      numUnits: units.length,
      units:
        units.length > 0
          ? {
              create: units.map((unit) => ({
                unitNumber: unit.unitNumber,
                unitType: unit.unitType,
                floorNumber: unit.floorNumber,
                areaSqm: unit.areaSqm,
                numBedrooms: unit.numBedrooms,
                numBathrooms: unit.numBathrooms,
                numParkingSpaces: unit.numParkingSpaces,
                electricityMeterNumber: unit.electricityMeterNumber,
                electricityAccountNumber: unit.electricityAccountNumber,
                electricityProvider: unit.electricityProvider,
                waterMeterNumber: unit.waterMeterNumber,
                waterAccountNumber: unit.waterAccountNumber,
                waterProvider: unit.waterProvider,
                furnishingStatus: unit.furnishingStatus,
                marketRentOmr: unit.marketRentOmr,
                notes: unit.notes,
              })),
            }
          : undefined,
    },
    include: { units: true },
  });

  await syncRePropertyAsset(property.id);
  await updatePropertyUnitCount(property.id);

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "ReProperty",
    resourceId: property.id,
    metadata: { name: property.name, propertyType: property.propertyType },
  });

  revalidateRealEstate(property.id);
  revalidatePath("/assets");
  return property;
}

export async function updateProperty(propertyId: string, formData: FormData) {
  const ctx = await requireReWrite();
  await findProperty(propertyId, ctx);

  const fields = readPropertyFieldsFromForm(formData);
  assertEntityAccess(ctx, fields.entityId);

  const property = await db.reProperty.update({
    where: { id: propertyId },
    data: fields,
  });

  await syncRePropertyAsset(property.id);

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "ReProperty",
    resourceId: property.id,
    metadata: { name: property.name },
  });

  revalidateRealEstate(property.id);
  revalidatePath("/assets");
  return property;
}

export async function deleteProperty(propertyId: string) {
  const ctx = await requireReWrite();
  const property = await db.reProperty.findFirst({
    where: { id: propertyId, ...rePropertyEntityFilter(ctx) },
    include: { documents: true },
  });
  if (!property) throw new Error("Property not found.");

  for (const doc of property.documents) {
    await deleteBlobUrl(doc.fileUrl);
  }

  const assetId = property.assetId;
  await db.reProperty.delete({ where: { id: propertyId } });

  if (assetId) {
    await db.asset.delete({ where: { id: assetId } });
  }

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "ReProperty",
    resourceId: propertyId,
    metadata: { name: property.name },
  });

  revalidateRealEstate();
  revalidatePath("/assets");
}

export async function listPropertiesForSelect() {
  const ctx = await requireReRead();
  return db.reProperty.findMany({
    where: rePropertyEntityFilter(ctx),
    select: { id: true, name: true, propertyType: true, status: true },
    orderBy: { name: "asc" },
  });
}

// ─── Units ──────────────────────────────────────────────────────────────────

export async function createUnit(propertyId: string, formData: FormData) {
  const ctx = await requireReWrite();
  await findProperty(propertyId, ctx);
  const fields = readUnitFieldsFromForm(formData);

  const unit = await db.reUnit.create({
    data: {
      propertyId,
      ...fields,
      occupancyStatus: fields.occupancyStatus ?? "VACANT",
      vacantSince: fields.occupancyStatus === "RENTED" ? null : new Date(),
    },
  });

  await updatePropertyUnitCount(propertyId);

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "ReUnit",
    resourceId: unit.id,
    metadata: { propertyId, unitNumber: unit.unitNumber },
  });

  revalidateRealEstate(propertyId);
  return unit;
}

export async function updateUnit(unitId: string, formData: FormData) {
  const ctx = await requireReWrite();
  const existing = await findUnit(unitId, ctx);
  const fields = readUnitFieldsFromForm(formData);

  const unit = await db.reUnit.update({
    where: { id: unitId },
    data: {
      ...fields,
      ...(fields.occupancyStatus === "VACANT" && existing.occupancyStatus !== "VACANT"
        ? { vacantSince: new Date() }
        : {}),
      ...(fields.occupancyStatus === "RENTED" ? { vacantSince: null } : {}),
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "ReUnit",
    resourceId: unit.id,
    metadata: { unitNumber: unit.unitNumber },
  });

  revalidateRealEstate(existing.propertyId);
  return unit;
}

export async function deleteUnit(unitId: string) {
  const ctx = await requireReWrite();
  const unit = await findUnit(unitId, ctx);

  const activeLease = await db.reLease.findFirst({
    where: { unitId, status: "ACTIVE" },
  });
  if (activeLease) {
    throw new Error("Cannot delete a unit with an active lease.");
  }

  await db.reUnit.delete({ where: { id: unitId } });
  await updatePropertyUnitCount(unit.propertyId);

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "ReUnit",
    resourceId: unitId,
    metadata: { propertyId: unit.propertyId, unitNumber: unit.unitNumber },
  });

  revalidateRealEstate(unit.propertyId);
}

// ─── Tenants ──────────────────────────────────────────────────────────────────

export async function createTenant(unitId: string, formData: FormData) {
  const ctx = await requireReWrite();
  const unit = await findUnit(unitId, ctx);
  const fields = readTenantFieldsFromForm(formData);

  const tenant = await db.reTenant.create({
    data: {
      unitId,
      ...fields,
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "ReTenant",
    resourceId: tenant.id,
    metadata: { unitId, fullName: tenant.fullName },
  });

  revalidateRealEstate(unit.propertyId);
  return tenant;
}

export async function updateTenant(tenantId: string, formData: FormData) {
  const ctx = await requireReWrite();
  const existing = await findTenant(tenantId, ctx);
  const fields = readTenantFieldsFromForm(formData);

  const tenant = await db.reTenant.update({
    where: { id: tenantId },
    data: fields,
  });

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "ReTenant",
    resourceId: tenant.id,
    metadata: { fullName: tenant.fullName },
  });

  revalidateRealEstate(existing.unit.propertyId);
  return tenant;
}

// ─── Leases ───────────────────────────────────────────────────────────────────

export async function createLease(formData: FormData) {
  const ctx = await requireReWrite();
  const fields = readLeaseFieldsFromForm(formData);
  const unit = await findUnit(fields.unitId, ctx);

  const activeLease = await db.reLease.findFirst({
    where: { unitId: fields.unitId, status: "ACTIVE" },
  });
  if (activeLease) {
    throw new Error("This unit already has an active lease.");
  }

  let tenantId = fields.tenantId;
  if (!tenantId) {
    const tenantFields = readTenantFieldsFromForm(formData);
    const tenant = await db.reTenant.create({
      data: {
        unitId: fields.unitId,
        ...tenantFields,
      },
    });
    tenantId = tenant.id;
  } else {
    const tenant = await findTenant(tenantId, ctx);
    if (tenant.unitId !== fields.unitId) {
      throw new Error("Tenant does not belong to the selected unit.");
    }
  }

  const leaseDurationMonths = computeLeaseDurationMonths(
    fields.leaseStartDate,
    fields.leaseEndDate,
  );

  const lease = await db.reLease.create({
    data: {
      unitId: fields.unitId,
      tenantId,
      leaseStartDate: fields.leaseStartDate,
      leaseEndDate: fields.leaseEndDate,
      leaseDurationMonths,
      noticePeriodDays: fields.noticePeriodDays,
      autoRenew: fields.autoRenew,
      rentAmountOmr: fields.rentAmountOmr,
      paymentFrequency: fields.paymentFrequency,
      paymentMethod: fields.paymentMethod,
      securityDepositOmr: fields.securityDepositOmr,
      securityDepositPaid: fields.securityDepositPaid,
      pdcBank: fields.pdcBank,
      pdcChequeNumbers: fields.pdcChequeNumbers ?? undefined,
      municipalityRegistrationNumber: fields.municipalityRegistrationNumber,
      municipalityRegistrationDate: fields.municipalityRegistrationDate,
      municipalityExpiryDate: fields.municipalityExpiryDate,
      legalReference: fields.legalReference,
      notes: fields.notes,
      status: "ACTIVE",
    },
  });

  await createRentScheduleEntries(lease.id, fields.unitId, lease);
  await setUnitRented(fields.unitId);
  await refreshRentScheduleStatuses();

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "ReLease",
    resourceId: lease.id,
    metadata: { unitId: fields.unitId, tenantId },
  });

  revalidateRealEstate(unit.propertyId);
  return lease;
}

export async function renewLease(leaseId: string, formData: FormData) {
  const ctx = await requireReWrite();
  const oldLease = await findLease(leaseId, ctx);

  if (oldLease.status !== "ACTIVE") {
    throw new Error("Only active leases can be renewed.");
  }

  const fields = readLeaseFieldsFromForm(formData);
  if (fields.unitId !== oldLease.unitId) {
    throw new Error("Renewal must use the same unit as the existing lease.");
  }

  await db.reLease.update({
    where: { id: leaseId },
    data: { status: "RENEWED" as ReLeaseStatus },
  });

  const leaseDurationMonths = computeLeaseDurationMonths(
    fields.leaseStartDate,
    fields.leaseEndDate,
  );

  const lease = await db.reLease.create({
    data: {
      unitId: oldLease.unitId,
      tenantId: fields.tenantId ?? oldLease.tenantId,
      leaseStartDate: fields.leaseStartDate,
      leaseEndDate: fields.leaseEndDate,
      leaseDurationMonths,
      noticePeriodDays: fields.noticePeriodDays,
      autoRenew: fields.autoRenew,
      rentAmountOmr: fields.rentAmountOmr,
      paymentFrequency: fields.paymentFrequency,
      paymentMethod: fields.paymentMethod,
      securityDepositOmr: fields.securityDepositOmr ?? oldLease.securityDepositOmr?.toString(),
      securityDepositPaid: fields.securityDepositPaid,
      pdcBank: fields.pdcBank ?? oldLease.pdcBank,
      pdcChequeNumbers: fields.pdcChequeNumbers ?? oldLease.pdcChequeNumbers ?? undefined,
      municipalityRegistrationNumber:
        fields.municipalityRegistrationNumber ?? oldLease.municipalityRegistrationNumber,
      municipalityRegistrationDate:
        fields.municipalityRegistrationDate ?? oldLease.municipalityRegistrationDate,
      municipalityExpiryDate:
        fields.municipalityExpiryDate ?? oldLease.municipalityExpiryDate,
      legalReference: fields.legalReference ?? oldLease.legalReference,
      notes: fields.notes ?? oldLease.notes,
      status: "ACTIVE",
    },
  });

  await createRentScheduleEntries(lease.id, oldLease.unitId, lease);
  await setUnitRented(oldLease.unitId);
  await refreshRentScheduleStatuses();

  await logAudit({
    userId: ctx.id,
    action: "RENEW",
    resource: "ReLease",
    resourceId: lease.id,
    metadata: { previousLeaseId: leaseId, unitId: oldLease.unitId },
  });

  revalidateRealEstate(oldLease.unit.propertyId);
  return lease;
}

export async function terminateLease(leaseId: string, formData: FormData) {
  const ctx = await requireReWrite();
  const lease = await findLease(leaseId, ctx);

  if (lease.status !== "ACTIVE") {
    throw new Error("Only active leases can be terminated.");
  }

  const terminationDate =
    parseDateInput(String(formData.get("terminationDate") ?? "")) ?? new Date();
  const terminationReason =
    String(formData.get("terminationReason") ?? "").trim() || undefined;
  const securityDepositReturned =
    String(formData.get("securityDepositReturned") ?? "") === "true";
  const securityDepositReturnDate = parseDateInput(
    String(formData.get("securityDepositReturnDate") ?? ""),
  );
  const securityDepositDeductionsOmr = parseDecimalInput(
    String(formData.get("securityDepositDeductionsOmr") ?? ""),
  );

  const updated = await db.reLease.update({
    where: { id: leaseId },
    data: {
      status: "TERMINATED",
      terminationDate,
      terminationReason,
      securityDepositReturned,
      securityDepositReturnDate,
      securityDepositDeductionsOmr,
    },
  });

  await setUnitVacant(lease.unitId);

  await logAudit({
    userId: ctx.id,
    action: "TERMINATE",
    resource: "ReLease",
    resourceId: leaseId,
    metadata: { unitId: lease.unitId, terminationDate: terminationDate.toISOString() },
  });

  revalidateRealEstate(lease.unit.propertyId);
  return updated;
}

// ─── Rent ─────────────────────────────────────────────────────────────────────

export async function markRentPaid(scheduleId: string, formData: FormData) {
  const ctx = await requireReWrite();
  const schedule = await findRentSchedule(scheduleId, ctx);

  const paidDate = parseDateInput(String(formData.get("paidDate") ?? "")) ?? new Date();
  const paidAmountOmr =
    parseDecimalInput(String(formData.get("paidAmountOmr") ?? "")) ??
    schedule.amountOmr.toString();
  const paymentMethod =
    (String(formData.get("paymentMethod") ?? "").trim() as RePaymentMethod) || undefined;
  const chequeNumber = String(formData.get("chequeNumber") ?? "").trim() || undefined;
  const bankReference = String(formData.get("bankReference") ?? "").trim() || undefined;
  const receiptNumber = String(formData.get("receiptNumber") ?? "").trim() || undefined;
  const notes = String(formData.get("notes") ?? "").trim() || undefined;

  const dueAmount = parseFloat(schedule.amountOmr.toString());
  const paidAmount = parseFloat(paidAmountOmr);
  const lateFee = parseFloat(schedule.lateFeeOmr?.toString() ?? "0");
  const totalDue = dueAmount + lateFee;

  let paymentStatus: ReRentPaymentStatus = "PAID";
  if (paidAmount < totalDue) {
    paymentStatus = "PARTIALLY_PAID";
  }

  const updated = await db.reRentSchedule.update({
    where: { id: scheduleId },
    data: {
      paymentStatus,
      paidDate,
      paidAmountOmr,
      paymentMethod,
      chequeNumber,
      bankReference,
      receiptNumber,
      notes: notes ?? schedule.notes,
      ...(schedule.pdcChequeNumber ? { pdcStatus: "CLEARED", pdcClearanceDate: paidDate } : {}),
    },
  });

  await refreshRentScheduleStatuses();

  await logAudit({
    userId: ctx.id,
    action: "PAY",
    resource: "ReRentSchedule",
    resourceId: scheduleId,
    metadata: { paidAmountOmr, paymentStatus },
  });

  revalidateRealEstate(schedule.unit.propertyId);
  return updated;
}

export async function markRentBounced(scheduleId: string) {
  const ctx = await requireReWrite();
  const schedule = await findRentSchedule(scheduleId, ctx);

  const updated = await db.reRentSchedule.update({
    where: { id: scheduleId },
    data: {
      pdcStatus: "BOUNCED",
      paymentStatus: "OVERDUE",
      paidDate: null,
      paidAmountOmr: null,
    },
  });

  await refreshRentScheduleStatuses();

  await logAudit({
    userId: ctx.id,
    action: "BOUNCE",
    resource: "ReRentSchedule",
    resourceId: scheduleId,
    metadata: { pdcChequeNumber: schedule.pdcChequeNumber },
  });

  revalidateRealEstate(schedule.unit.propertyId);
  return updated;
}

export async function addLateFee(scheduleId: string, amount: string) {
  const ctx = await requireReWrite();
  const schedule = await findRentSchedule(scheduleId, ctx);

  const fee = parseDecimalInput(amount);
  if (!fee) throw new Error("Late fee amount is required.");

  const existingFee = parseFloat(schedule.lateFeeOmr?.toString() ?? "0");
  const newFee = (existingFee + parseFloat(fee)).toFixed(3);

  const updated = await db.reRentSchedule.update({
    where: { id: scheduleId },
    data: { lateFeeOmr: newFee },
  });

  await logAudit({
    userId: ctx.id,
    action: "LATE_FEE",
    resource: "ReRentSchedule",
    resourceId: scheduleId,
    metadata: { lateFeeOmr: newFee },
  });

  revalidateRealEstate(schedule.unit.propertyId);
  return updated;
}

export async function generateNextPeriodRent(propertyId?: string) {
  const ctx = await requireReWrite();

  const leases = await db.reLease.findMany({
    where: {
      status: "ACTIVE",
      ...(propertyId
        ? { unit: { propertyId, property: rePropertyEntityFilter(ctx) } }
        : { unit: { property: rePropertyEntityFilter(ctx) } }),
    },
  });

  let created = 0;
  for (const lease of leases) {
    created += await appendMissingFutureRentSchedules(lease);
  }

  await refreshRentScheduleStatuses();

  await logAudit({
    userId: ctx.id,
    action: "GENERATE_RENT",
    resource: "ReRentSchedule",
    metadata: { propertyId, leasesProcessed: leases.length, entriesCreated: created },
  });

  revalidateRealEstate(propertyId);
  return { leasesProcessed: leases.length, entriesCreated: created };
}

export async function updateRentScheduleNote(scheduleId: string, notes: string) {
  const ctx = await requireReWrite();
  const schedule = await findRentSchedule(scheduleId, ctx);

  const updated = await db.reRentSchedule.update({
    where: { id: scheduleId },
    data: { notes: notes.trim() || null },
  });

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "ReRentSchedule",
    resourceId: scheduleId,
    metadata: { notes: updated.notes },
  });

  revalidateRealEstate(schedule.unit.propertyId);
  return updated;
}

// ─── Maintenance ────────────────────────────────────────────────────────────────

export async function createMaintenanceRequest(propertyId: string, formData: FormData) {
  const ctx = await requireReWrite();
  await findProperty(propertyId, ctx);

  const unitId = String(formData.get("unitId") ?? "").trim() || undefined;
  if (unitId) {
    const unit = await findUnit(unitId, ctx);
    if (unit.propertyId !== propertyId) {
      throw new Error("Unit does not belong to this property.");
    }
  }

  const category = String(formData.get("category") ?? "").trim() as ReMaintenanceCategory;
  const description = String(formData.get("description") ?? "").trim();
  if (!category) throw new Error("Maintenance category is required.");
  if (!description) throw new Error("Description is required.");

  const request = await db.reMaintenanceRequest.create({
    data: {
      propertyId,
      unitId,
      reportedBy:
        (String(formData.get("reportedBy") ?? "OWNER").trim() as ReMaintenanceReportedBy) ||
        "OWNER",
      reportedDate: parseDateInput(String(formData.get("reportedDate") ?? "")) ?? new Date(),
      category,
      priority:
        (String(formData.get("priority") ?? "MEDIUM").trim() as ReMaintenancePriority) || "MEDIUM",
      description,
      assignedTo: String(formData.get("assignedTo") ?? "").trim() || undefined,
      contractorCompany: String(formData.get("contractorCompany") ?? "").trim() || undefined,
      contractorPhone: String(formData.get("contractorPhone") ?? "").trim() || undefined,
      scheduledDate: parseDateInput(String(formData.get("scheduledDate") ?? "")),
      quotedCostOmr: parseDecimalInput(String(formData.get("quotedCostOmr") ?? "")),
      chargedTo:
        (String(formData.get("chargedTo") ?? "").trim() as ReMaintenanceChargedTo) || undefined,
      paidByOwner: String(formData.get("paidByOwner") ?? "true") !== "false",
      status: "OPEN",
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "ReMaintenanceRequest",
    resourceId: request.id,
    metadata: { propertyId, category },
  });

  revalidateRealEstate(propertyId);
  return request;
}

export async function updateMaintenanceRequest(id: string, formData: FormData) {
  const ctx = await requireReWrite();

  const existing = await db.reMaintenanceRequest.findFirst({
    where: { id, property: rePropertyEntityFilter(ctx) },
  });
  if (!existing) throw new Error("Maintenance request not found.");

  const unitId = String(formData.get("unitId") ?? "").trim() || undefined;
  if (unitId) {
    const unit = await findUnit(unitId, ctx);
    if (unit.propertyId !== existing.propertyId) {
      throw new Error("Unit does not belong to this property.");
    }
  }

  const category =
    (String(formData.get("category") ?? "").trim() as ReMaintenanceCategory) || existing.category;
  const description = String(formData.get("description") ?? "").trim() || existing.description;

  const request = await db.reMaintenanceRequest.update({
    where: { id },
    data: {
      unitId,
      reportedBy:
        (String(formData.get("reportedBy") ?? "").trim() as ReMaintenanceReportedBy) ||
        existing.reportedBy,
      reportedDate:
        parseDateInput(String(formData.get("reportedDate") ?? "")) ?? existing.reportedDate,
      category,
      priority:
        (String(formData.get("priority") ?? "").trim() as ReMaintenancePriority) ||
        existing.priority,
      description,
      assignedTo: String(formData.get("assignedTo") ?? "").trim() || undefined,
      contractorCompany: String(formData.get("contractorCompany") ?? "").trim() || undefined,
      contractorPhone: String(formData.get("contractorPhone") ?? "").trim() || undefined,
      scheduledDate: parseDateInput(String(formData.get("scheduledDate") ?? "")),
      quotedCostOmr: parseDecimalInput(String(formData.get("quotedCostOmr") ?? "")),
      actualCostOmr:
        parseDecimalInput(String(formData.get("actualCostOmr") ?? "")) ?? existing.actualCostOmr?.toString(),
      invoiceNumber: String(formData.get("invoiceNumber") ?? "").trim() || undefined,
      chargedTo:
        (String(formData.get("chargedTo") ?? "").trim() as ReMaintenanceChargedTo) || undefined,
      paidByOwner: String(formData.get("paidByOwner") ?? "") !== "false",
      resolutionNotes: String(formData.get("resolutionNotes") ?? "").trim() || undefined,
    },
  });

  await syncMaintenanceExpenseRecord(request);

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "ReMaintenanceRequest",
    resourceId: id,
    metadata: { propertyId: existing.propertyId },
  });

  revalidateRealEstate(existing.propertyId);
  return request;
}

export async function updateMaintenanceStatus(
  id: string,
  status: ReMaintenanceStatus,
  formData?: FormData,
) {
  const ctx = await requireReWrite();

  const existing = await db.reMaintenanceRequest.findFirst({
    where: { id, property: rePropertyEntityFilter(ctx) },
  });
  if (!existing) throw new Error("Maintenance request not found.");

  const data: {
    status: ReMaintenanceStatus;
    completedDate?: Date;
    resolutionNotes?: string;
    actualCostOmr?: string;
    invoiceNumber?: string;
  } = { status };

  if (status === "COMPLETED") {
    data.completedDate =
      parseDateInput(String(formData?.get("completedDate") ?? "")) ?? new Date();
    data.resolutionNotes =
      String(formData?.get("resolutionNotes") ?? "").trim() || undefined;
    data.actualCostOmr =
      parseDecimalInput(String(formData?.get("actualCostOmr") ?? "")) ??
      existing.actualCostOmr?.toString() ??
      existing.quotedCostOmr?.toString();
    data.invoiceNumber = String(formData?.get("invoiceNumber") ?? "").trim() || undefined;
  }

  const request = await db.reMaintenanceRequest.update({
    where: { id },
    data,
  });

  await syncMaintenanceExpenseRecord(request);

  await logAudit({
    userId: ctx.id,
    action: "STATUS",
    resource: "ReMaintenanceRequest",
    resourceId: id,
    metadata: { status, propertyId: existing.propertyId },
  });

  revalidateRealEstate(existing.propertyId);
  return request;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export async function createUtilityReading(unitId: string, formData: FormData) {
  const ctx = await requireReWrite();
  const unit = await findUnit(unitId, ctx);

  const utilityType = String(formData.get("utilityType") ?? "").trim() as ReUtilityType;
  const readingDate = parseDateInput(String(formData.get("readingDate") ?? ""));
  const meterReading = parseDecimalInput(String(formData.get("meterReading") ?? ""));

  if (!utilityType) throw new Error("Utility type is required.");
  if (!readingDate) throw new Error("Reading date is required.");
  if (!meterReading) throw new Error("Meter reading is required.");

  const previous = await db.reUtilityReading.findFirst({
    where: { unitId, utilityType },
    orderBy: { readingDate: "desc" },
  });

  const previousReading = previous?.meterReading?.toString();
  let unitsConsumed: string | undefined;
  if (previousReading) {
    const consumed = parseFloat(meterReading) - parseFloat(previousReading);
    unitsConsumed = consumed >= 0 ? consumed.toFixed(3) : undefined;
  }

  const reading = await db.reUtilityReading.create({
    data: {
      unitId,
      utilityType,
      readingDate,
      meterReading,
      previousReading,
      unitsConsumed,
      amountOmr: parseDecimalInput(String(formData.get("amountOmr") ?? "")),
      billReference: String(formData.get("billReference") ?? "").trim() || undefined,
      paymentStatus:
        (String(formData.get("paymentStatus") ?? "UNPAID").trim() as ReUtilityPaymentStatus) ||
        "UNPAID",
      notes: String(formData.get("notes") ?? "").trim() || undefined,
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "ReUtilityReading",
    resourceId: reading.id,
    metadata: { unitId, utilityType, unitsConsumed },
  });

  revalidateRealEstate(unit.propertyId);
  return reading;
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export async function createPropertyExpense(propertyId: string, formData: FormData) {
  const ctx = await requireReWrite();
  await findProperty(propertyId, ctx);

  const unitId = String(formData.get("unitId") ?? "").trim() || undefined;
  if (unitId) {
    const unit = await findUnit(unitId, ctx);
    if (unit.propertyId !== propertyId) {
      throw new Error("Unit does not belong to this property.");
    }
  }

  const expenseDate = parseDateInput(String(formData.get("expenseDate") ?? ""));
  const category = String(formData.get("category") ?? "").trim() as RePropertyExpenseCategory;
  const description = String(formData.get("description") ?? "").trim();
  const amountOmr = parseDecimalInput(String(formData.get("amountOmr") ?? ""));

  if (!expenseDate) throw new Error("Expense date is required.");
  if (!category) throw new Error("Expense category is required.");
  if (!description) throw new Error("Description is required.");
  if (!amountOmr) throw new Error("Amount is required.");

  const expense = await db.rePropertyExpense.create({
    data: {
      propertyId,
      unitId,
      expenseDate,
      category,
      description,
      amountOmr,
      vendorName: String(formData.get("vendorName") ?? "").trim() || undefined,
      invoiceNumber: String(formData.get("invoiceNumber") ?? "").trim() || undefined,
      paymentStatus:
        (String(formData.get("paymentStatus") ?? "UNPAID").trim() as ReExpensePaymentStatus) ||
        "UNPAID",
      paymentDate: parseDateInput(String(formData.get("paymentDate") ?? "")),
      recurring: String(formData.get("recurring") ?? "") === "true",
      recurrenceFrequency:
        (String(formData.get("recurrenceFrequency") ?? "").trim() as ReRecurrenceFrequency) ||
        undefined,
      notes: String(formData.get("notes") ?? "").trim() || undefined,
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "RePropertyExpense",
    resourceId: expense.id,
    metadata: { propertyId, category, amountOmr },
  });

  revalidateRealEstate(propertyId);
  return expense;
}

export async function deletePropertyExpense(id: string) {
  const ctx = await requireReWrite();

  const expense = await db.rePropertyExpense.findFirst({
    where: { id, property: rePropertyEntityFilter(ctx) },
  });
  if (!expense) throw new Error("Expense not found.");

  await db.rePropertyExpense.delete({ where: { id } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "RePropertyExpense",
    resourceId: id,
    metadata: { propertyId: expense.propertyId },
  });

  revalidateRealEstate(expense.propertyId);
}

// ─── Valuations ───────────────────────────────────────────────────────────────

export async function createPropertyValuation(propertyId: string, formData: FormData) {
  const ctx = await requireReWrite();
  await findProperty(propertyId, ctx);

  const valuationDate = parseDateInput(String(formData.get("valuationDate") ?? ""));
  const valuationOmr = parseDecimalInput(String(formData.get("valuationOmr") ?? ""));

  if (!valuationDate) throw new Error("Valuation date is required.");
  if (!valuationOmr) throw new Error("Valuation amount is required.");

  const method =
    (String(formData.get("method") ?? "").trim() as ReValuationMethod) || undefined;

  const valuation = await db.rePropertyValuation.create({
    data: {
      propertyId,
      valuationDate,
      valuationOmr,
      method,
      appraiserName: String(formData.get("appraiserName") ?? "").trim() || undefined,
      appraiserCompany: String(formData.get("appraiserCompany") ?? "").trim() || undefined,
      notes: String(formData.get("notes") ?? "").trim() || undefined,
    },
  });

  await db.reProperty.update({
    where: { id: propertyId },
    data: {
      currentValuationOmr: valuationOmr,
      lastValuationDate: valuationDate,
      valuationMethod: method,
    },
  });

  await syncRePropertyAsset(propertyId);

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "RePropertyValuation",
    resourceId: valuation.id,
    metadata: { propertyId, valuationOmr },
  });

  revalidateRealEstate(propertyId);
  revalidatePath("/assets");
  return valuation;
}

// ─── Documents ────────────────────────────────────────────────────────────────

export async function uploadPropertyDocuments(propertyId: string, formData: FormData) {
  const ctx = await requireReWrite();
  await findProperty(propertyId, ctx);

  const documentType = String(formData.get("documentType") ?? "").trim() as RePropertyDocumentType;
  if (!documentType) throw new Error("Document type is required.");

  const files = getFilesFromFormData(formData, "files");
  if (files.length === 0) throw new Error("At least one file is required.");

  const unitId = String(formData.get("unitId") ?? "").trim() || undefined;
  const leaseId = String(formData.get("leaseId") ?? "").trim() || undefined;
  const maintenanceRequestId =
    String(formData.get("maintenanceRequestId") ?? "").trim() || undefined;
  const expiryDate = parseDateInput(String(formData.get("expiryDate") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim() || undefined;

  if (unitId) {
    const unit = await findUnit(unitId, ctx);
    if (unit.propertyId !== propertyId) {
      throw new Error("Unit does not belong to this property.");
    }
  }
  if (leaseId) {
    const lease = await findLease(leaseId, ctx);
    if (lease.unit.propertyId !== propertyId) {
      throw new Error("Lease does not belong to this property.");
    }
  }
  if (maintenanceRequestId) {
    const maintenance = await db.reMaintenanceRequest.findFirst({
      where: { id: maintenanceRequestId, propertyId },
    });
    if (!maintenance) throw new Error("Maintenance request not found.");
  }

  const created = await uploadPropertyFiles(propertyId, files, documentType, ctx.id, {
    unitId,
    leaseId,
    maintenanceRequestId,
    expiryDate,
    notes,
  });

  await logAudit({
    userId: ctx.id,
    action: "UPLOAD",
    resource: "RePropertyDocument",
    resourceId: propertyId,
    metadata: { documentType, count: created.length },
  });

  revalidateRealEstate(propertyId);
  return created;
}

export async function deletePropertyDocument(documentId: string) {
  const ctx = await requireReWrite();

  const document = await db.rePropertyDocument.findFirst({
    where: { id: documentId, property: rePropertyEntityFilter(ctx) },
    include: { property: true },
  });
  if (!document) throw new Error("Document not found.");

  await deleteBlobUrl(document.fileUrl);
  await db.rePropertyDocument.delete({ where: { id: documentId } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "RePropertyDocument",
    resourceId: documentId,
    metadata: { propertyId: document.propertyId, fileName: document.fileName },
  });

  revalidateRealEstate(document.propertyId);
}
