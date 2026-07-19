"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ensureRealEstateSchema } from "@/lib/db/ensure-real-estate-schema";
import { deleteBlobUrl, uploadPrivateFile } from "@/lib/blob";
import { logAudit } from "@/lib/audit/log";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { linkableMortgageLoanFilter, rePropertyEntityFilter } from "@/lib/permissions/scoped-queries";
import { syncRePropertyAsset } from "@/lib/real-estate/asset-sync";
import {
  parseDateInput,
  parseDecimalInput,
  parseIntInput,
} from "@/lib/real-estate/helpers";
import {
  LINKABLE_MORTGAGE_LIABILITY_TYPES,
  PRIVATE_RE_PATH,
  PRIVATE_RUNNING_COST_CATEGORIES,
} from "@/lib/real-estate/private-constants";
import type {
  ReFinishingQuality,
  ReFurnishingStatus,
  ReOwnershipStatus,
  RePrivateCostCategory,
  RePrivateStaffArrangement,
  RePrivateStaffRole,
  RePropertyCondition,
  RePropertyDocumentType,
  RePropertyStatus,
  ReRecurrenceFrequency,
  ReValuationMethod,
} from "@/lib/generated/prisma/client";

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

function revalidatePrivate(propertyId?: string) {
  revalidatePath(PRIVATE_RE_PATH);
  if (propertyId) {
    revalidatePath(`${PRIVATE_RE_PATH}/${propertyId}`);
    revalidatePath(`${PRIVATE_RE_PATH}/${propertyId}/edit`);
  }
}

async function requirePrivateWrite() {
  await ensureRealEstateSchema();
  const ctx = await requireModuleAccess("REAL_ESTATE");
  if (!canWrite(ctx, "REAL_ESTATE")) {
    throw new Error("You do not have permission to modify private real estate records.");
  }
  return ctx;
}

async function requirePrivateRead() {
  await ensureRealEstateSchema();
  return requireModuleAccess("REAL_ESTATE");
}

async function findPrivateProperty(id: string, ctx: Awaited<ReturnType<typeof requirePrivateRead>>) {
  const property = await db.reProperty.findFirst({
    where: { id, portfolioTrack: "PRIVATE", ...rePropertyEntityFilter(ctx) },
    select: { id: true, entityId: true, name: true },
  });
  if (!property) throw new Error("Private property not found.");
  return property;
}

function readCorePropertyFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const entityId = String(formData.get("entityId") ?? "").trim();
  if (!name) throw new Error("Villa name is required.");
  if (!entityId) throw new Error("Entity is required.");

  return {
    name,
    entityId,
    ownershipStatus:
      (String(formData.get("ownershipStatus") ?? "OWNED").trim() as ReOwnershipStatus) || "OWNED",
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
    mortgageOutstandingOmr: parseDecimalInput(String(formData.get("mortgageOutstandingOmr") ?? "")),
    mortgageMonthlyPaymentOmr: parseDecimalInput(
      String(formData.get("mortgageMonthlyPaymentOmr") ?? ""),
    ),
    mortgageEndDate: parseDateInput(String(formData.get("mortgageEndDate") ?? "")),
    status: (String(formData.get("status") ?? "ACTIVE").trim() as RePropertyStatus) || "ACTIVE",
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  };
}

function readPrivateDetailFields(formData: FormData) {
  return {
    titleDeedNumber: String(formData.get("titleDeedNumber") ?? "").trim() || undefined,
    registeredOwner: String(formData.get("registeredOwner") ?? "").trim() || undefined,
    beneficialOwner: String(formData.get("beneficialOwner") ?? "").trim() || undefined,
    numBedrooms: parseIntInput(String(formData.get("numBedrooms") ?? "")),
    numBathrooms: parseIntInput(String(formData.get("numBathrooms") ?? "")),
    numParkingSpaces: parseIntInput(String(formData.get("numParkingSpaces") ?? "")),
    constructionType: String(formData.get("constructionType") ?? "").trim() || undefined,
    finishingQuality:
      (String(formData.get("finishingQuality") ?? "").trim() as ReFinishingQuality) || undefined,
    furnishingStatus:
      (String(formData.get("furnishingStatus") ?? "").trim() as ReFurnishingStatus) || undefined,
    hasPool: formData.get("hasPool") === "on" || formData.get("hasPool") === "true",
    hasGardenLandscaping:
      formData.get("hasGardenLandscaping") === "on" ||
      formData.get("hasGardenLandscaping") === "true",
    hasSmartHome:
      formData.get("hasSmartHome") === "on" || formData.get("hasSmartHome") === "true",
    condition:
      (String(formData.get("condition") ?? "").trim() as RePropertyCondition) || undefined,
    lastRenovationDate: parseDateInput(String(formData.get("lastRenovationDate") ?? "")),
    lastRenovationCostOmr: parseDecimalInput(String(formData.get("lastRenovationCostOmr") ?? "")),
    wasiyyaConditions: String(formData.get("wasiyyaConditions") ?? "").trim() || undefined,
  };
}

async function seedRunningCosts(propertyId: string) {
  for (const category of PRIVATE_RUNNING_COST_CATEGORIES) {
    await db.rePrivateRunningCost.create({
      data: { propertyId, category },
    });
  }
}

export async function createPrivateProperty(formData: FormData) {
  const ctx = await requirePrivateWrite();
  const core = readCorePropertyFields(formData);
  const detail = readPrivateDetailFields(formData);
  assertEntityAccess(ctx, core.entityId);

  const property = await db.reProperty.create({
    data: {
      ...core,
      propertyType: "VILLA",
      portfolioTrack: "PRIVATE",
      numUnits: 0,
      privateDetail: { create: detail },
    },
  });

  await seedRunningCosts(property.id);
  await syncRePropertyAsset(property.id);

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "ReProperty",
    resourceId: property.id,
    metadata: { portfolioTrack: "PRIVATE", name: property.name },
  });

  revalidatePrivate(property.id);
  return property.id;
}

export async function updatePrivateProperty(propertyId: string, formData: FormData) {
  const ctx = await requirePrivateWrite();
  await findPrivateProperty(propertyId, ctx);
  const core = readCorePropertyFields(formData);
  const detail = readPrivateDetailFields(formData);
  assertEntityAccess(ctx, core.entityId);

  await db.reProperty.update({
    where: { id: propertyId },
    data: {
      ...core,
      privateDetail: {
        upsert: {
          create: detail,
          update: detail,
        },
      },
    },
  });

  await syncRePropertyAsset(propertyId);

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "ReProperty",
    resourceId: propertyId,
    metadata: { portfolioTrack: "PRIVATE" },
  });

  revalidatePrivate(propertyId);
}

export async function upsertPrivateRunningCost(propertyId: string, formData: FormData) {
  const ctx = await requirePrivateWrite();
  await findPrivateProperty(propertyId, ctx);

  const category = String(formData.get("category") ?? "").trim() as RePrivateCostCategory;
  if (!category) throw new Error("Cost category is required.");

  const data = {
    provider: String(formData.get("provider") ?? "").trim() || undefined,
    meterNumber: String(formData.get("meterNumber") ?? "").trim() || undefined,
    accountNumber: String(formData.get("accountNumber") ?? "").trim() || undefined,
    frequency:
      (String(formData.get("frequency") ?? "").trim() as ReRecurrenceFrequency) || undefined,
    monthlyCostOmr: parseDecimalInput(String(formData.get("monthlyCostOmr") ?? "")),
    annualCostOmr: parseDecimalInput(String(formData.get("annualCostOmr") ?? "")),
    paymentStatus: String(formData.get("paymentStatus") ?? "").trim() || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  };

  await db.rePrivateRunningCost.upsert({
    where: { propertyId_category: { propertyId, category } },
    create: { propertyId, category, ...data },
    update: data,
  });

  revalidatePrivate(propertyId);
}

export async function upsertPrivateStaff(propertyId: string, formData: FormData) {
  const ctx = await requirePrivateWrite();
  await findPrivateProperty(propertyId, ctx);

  const id = String(formData.get("id") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!fullName) throw new Error("Staff name is required.");

  const data = {
    fullName,
    nationality: String(formData.get("nationality") ?? "").trim() || undefined,
    idNumber: String(formData.get("idNumber") ?? "").trim() || undefined,
    role: (String(formData.get("role") ?? "OTHER").trim() as RePrivateStaffRole) || "OTHER",
    arrangement:
      (String(formData.get("arrangement") ?? "").trim() as RePrivateStaffArrangement) || undefined,
    contractExpiry: parseDateInput(String(formData.get("contractExpiry") ?? "")),
    visaExpiry: parseDateInput(String(formData.get("visaExpiry") ?? "")),
    monthlySalaryOmr: parseDecimalInput(String(formData.get("monthlySalaryOmr") ?? "")),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  };

  if (id) {
    await db.rePrivateStaff.update({ where: { id }, data });
  } else {
    await db.rePrivateStaff.create({ data: { propertyId, ...data } });
  }

  revalidatePrivate(propertyId);
}

export async function deletePrivateStaff(propertyId: string, staffId: string) {
  const ctx = await requirePrivateWrite();
  await findPrivateProperty(propertyId, ctx);

  const staff = await db.rePrivateStaff.findFirst({
    where: { id: staffId, propertyId },
  });
  if (!staff) throw new Error("Staff member not found.");

  await db.rePrivateStaff.delete({ where: { id: staffId } });
  revalidatePrivate(propertyId);
}

export async function linkPrivateMortgage(propertyId: string, liabilityId: string | null) {
  const ctx = await requirePrivateWrite();
  const property = await findPrivateProperty(propertyId, ctx);

  if (!liabilityId) {
    await db.reProperty.update({
      where: { id: propertyId },
      data: { liabilityId: null },
    });
    revalidatePrivate(propertyId);
    return;
  }

  const liability = await db.liability.findFirst({
    where: {
      id: liabilityId,
      entityId: property.entityId,
      type: { in: LINKABLE_MORTGAGE_LIABILITY_TYPES },
      ...linkableMortgageLoanFilter(ctx),
    },
  });
  if (!liability) throw new Error("Loan not found or cannot be linked.");

  await db.reProperty.update({
    where: { id: propertyId },
    data: { liabilityId },
  });

  revalidatePrivate(propertyId);
}

export async function upsertPrivateBeneficiary(propertyId: string, formData: FormData) {
  const ctx = await requirePrivateWrite();
  const property = await findPrivateProperty(propertyId, ctx);

  const familyMemberId = String(formData.get("familyMemberId") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || undefined;
  const allocationPct = parseDecimalInput(String(formData.get("allocationPct") ?? ""));
  if (!familyMemberId) throw new Error("Family member is required.");

  const existing = await db.beneficiaryDesignation.findFirst({
    where: { rePropertyId: propertyId, familyMemberId },
  });

  if (existing) {
    await db.beneficiaryDesignation.update({
      where: { id: existing.id },
      data: { notes, allocationPct: allocationPct?.toString() },
    });
  } else {
    await db.beneficiaryDesignation.create({
      data: {
        familyMemberId,
        rePropertyId: propertyId,
        notes,
        allocationPct: allocationPct?.toString(),
      },
    });
  }

  revalidatePrivate(propertyId);
}

export async function deletePrivateBeneficiary(propertyId: string, designationId: string) {
  const ctx = await requirePrivateWrite();
  await findPrivateProperty(propertyId, ctx);

  await db.beneficiaryDesignation.deleteMany({
    where: { id: designationId, rePropertyId: propertyId },
  });

  revalidatePrivate(propertyId);
}

export async function uploadPrivatePropertyDocuments(propertyId: string, formData: FormData) {
  const ctx = await requirePrivateWrite();
  await findPrivateProperty(propertyId, ctx);

  const documentType = String(formData.get("documentType") ?? "OTHER").trim() as RePropertyDocumentType;
  const expiryDate = parseDateInput(String(formData.get("expiryDate") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim() || undefined;
  const files = getFilesFromFormData(formData, "files");
  if (files.length === 0) throw new Error("Select at least one file.");

  for (const file of files) {
    const uploaded = await uploadPrivateFile(
      ["real-estate", "private", propertyId, documentType.toLowerCase()],
      file,
    );
    try {
      await db.rePropertyDocument.create({
        data: {
          propertyId,
          documentType,
          fileName: uploaded.fileName,
          fileUrl: uploaded.fileUrl,
          mimeType: uploaded.mimeType,
          fileSize: uploaded.fileSize,
          expiryDate: expiryDate ?? undefined,
          notes,
          uploadedById: ctx.id,
        },
      });
    } catch (error) {
      await deleteBlobUrl(uploaded.fileUrl);
      throw error;
    }
  }

  revalidatePrivate(propertyId);
}

export async function deletePrivatePropertyDocument(propertyId: string, documentId: string) {
  const ctx = await requirePrivateWrite();
  await findPrivateProperty(propertyId, ctx);

  const document = await db.rePropertyDocument.findFirst({
    where: { id: documentId, propertyId },
  });
  if (!document) throw new Error("Document not found.");

  await deleteBlobUrl(document.fileUrl);
  await db.rePropertyDocument.delete({ where: { id: documentId } });
  revalidatePrivate(propertyId);
}

export async function createPrivatePropertyValuation(propertyId: string, formData: FormData) {
  const ctx = await requirePrivateWrite();
  await findPrivateProperty(propertyId, ctx);

  const valuationDate = parseDateInput(String(formData.get("valuationDate") ?? ""));
  const valueOmr = parseDecimalInput(String(formData.get("valueOmr") ?? ""));
  if (!valuationDate) throw new Error("Valuation date is required.");
  if (!valueOmr) throw new Error("Valuation amount is required.");

  await db.rePropertyValuation.create({
    data: {
      propertyId,
      valuationDate,
      valuationOmr: valueOmr.toString(),
      method: (String(formData.get("method") ?? "MARKET_APPRAISAL").trim() as ReValuationMethod) || "MARKET_APPRAISAL",
      notes: String(formData.get("notes") ?? "").trim() || undefined,
    },
  });

  await db.reProperty.update({
    where: { id: propertyId },
    data: {
      currentValuationOmr: valueOmr.toString(),
      lastValuationDate: valuationDate,
    },
  });

  await syncRePropertyAsset(propertyId);
  revalidatePrivate(propertyId);
}
