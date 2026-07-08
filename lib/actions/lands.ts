"use server";

import { createAssetExitRecord } from "@/lib/actions/asset-exits";
import { assertStatusNotExited } from "@/lib/assets/status";
import { revalidatePath } from "next/cache";
import { db, type DbClient } from "@/lib/db";
import { deleteBlobUrl, uploadPrivateFile } from "@/lib/blob";
import { logAudit } from "@/lib/audit/log";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { landEntityFilter } from "@/lib/permissions/scoped-queries";
import {
  assertEnumValue,
  assertOwnershipPercentagesValid,
  parseOrThrow,
  zOptionalDate,
  zOptionalDecimal,
  zRequiredDate,
  zRequiredDecimal,
  zRequiredString,
} from "@/lib/validation/primitives";
import type { AssetStatus, LandDocumentType, LandLocationType, LandSaleDocumentType } from "@/lib/generated/prisma/client";

const ASSET_STATUS_VALUES = ["ACTIVE", "MONITOR", "EXITED", "DEFERRED"] as const satisfies readonly AssetStatus[];

export type LandRegisteredHolderInput = {
  name: string;
  ownershipPct?: string;
  email?: string;
  phone?: string;
  notes?: string;
};

async function uploadLandFiles(
  landParcelId: string,
  files: File[],
  documentType: LandDocumentType,
  uploadedById: string,
  labelPrefix?: string,
) {
  const created = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!(file instanceof File) || file.size === 0) continue;

    const uploaded = await uploadPrivateFile(["lands", landParcelId, documentType.toLowerCase()], file);
    try {
      const doc = await db.landDocument.create({
        data: {
          landParcelId,
          documentType,
          label: labelPrefix ? labelPrefix + " " + (i + 1) : uploaded.fileName,
          fileName: uploaded.fileName,
          fileUrl: uploaded.fileUrl,
          mimeType: uploaded.mimeType,
          fileSize: uploaded.fileSize,
          uploadedById,
        },
      });
      created.push(doc);
    } catch (error) {
      await deleteBlobUrl(uploaded.fileUrl);
      throw error;
    }
  }
  return created;
}

async function uploadLandSaleFiles(
  landSaleId: string,
  landParcelId: string,
  files: File[],
  documentType: LandSaleDocumentType,
  uploadedById: string,
  labelPrefix?: string,
) {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!(file instanceof File) || file.size === 0) continue;

    const uploaded = await uploadPrivateFile(
      ["lands", landParcelId, "sale", documentType.toLowerCase()],
      file,
    );
    try {
      await db.landSaleDocument.create({
        data: {
          landSaleId,
          documentType,
          label: labelPrefix ? labelPrefix + " " + (i + 1) : uploaded.fileName,
          fileName: uploaded.fileName,
          fileUrl: uploaded.fileUrl,
          mimeType: uploaded.mimeType,
          fileSize: uploaded.fileSize,
          uploadedById,
        },
      });
    } catch (error) {
      await deleteBlobUrl(uploaded.fileUrl);
      throw error;
    }
  }
}

function getFilesFromFormData(formData: FormData, field: string): File[] {
  return formData
    .getAll(field)
    .filter((item): item is File => item instanceof File && item.size > 0);
}

function buildLocation(
  location: {
    locationType: LandLocationType;
    country: string;
    governorate?: string | null;
    wilayat?: string | null;
    region?: string | null;
    city?: string | null;
  },
  village?: string,
) {
  if (location.locationType === "INTERNATIONAL") {
    return [village, location.city, location.region, location.country].filter(Boolean).join(", ");
  }
  return [village, location.wilayat, location.governorate].filter(Boolean).join(", ");
}

function parseHoldersJson(raw: string): LandRegisteredHolderInput[] {
  if (!raw.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid registered holders data.");
  }
  if (!Array.isArray(parsed)) throw new Error("Registered holders must be a list.");

  const holders: LandRegisteredHolderInput[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const name = String(record.name ?? "").trim();
    if (!name) continue;
    const ownershipPct = String(record.ownershipPct ?? "").trim() || undefined;
    if (ownershipPct !== undefined) {
      const n = Number(ownershipPct);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        throw new Error(`Ownership % for "${name}" must be between 0 and 100.`);
      }
    }
    holders.push({
      name,
      ownershipPct,
      email: String(record.email ?? "").trim() || undefined,
      phone: String(record.phone ?? "").trim() || undefined,
      notes: String(record.notes ?? "").trim() || undefined,
    });
  }
  assertOwnershipPercentagesValid(
    holders.map((h) => h.ownershipPct),
    "Registered holder ownership percentages",
  );
  return holders;
}

function formatRegisteredHolderSummary(holders: LandRegisteredHolderInput[]) {
  return holders.map((holder) => holder.name).join(", ") || undefined;
}

async function replaceLandHolders(client: DbClient, landParcelId: string, holders: LandRegisteredHolderInput[]) {
  await client.landRegisteredHolder.deleteMany({ where: { landParcelId } });
  if (holders.length === 0) return;

  await client.landRegisteredHolder.createMany({
    data: holders.map((holder, index) => ({
      landParcelId,
      name: holder.name,
      ownershipPct: holder.ownershipPct || undefined,
      email: holder.email,
      phone: holder.phone,
      notes: holder.notes,
      sortOrder: index,
    })),
  });
}

function readLandLocationFromForm(formData: FormData) {
  const locationType = String(formData.get("locationType") ?? "OMAN") as LandLocationType;

  if (locationType === "INTERNATIONAL") {
    const countrySelect = String(formData.get("country") ?? "").trim();
    const countryOther = String(formData.get("countryOther") ?? "").trim();
    const country = countrySelect === "OTHER" ? countryOther : countrySelect;
    const city = String(formData.get("city") ?? "").trim();
    const region = String(formData.get("region") ?? "").trim() || undefined;

    if (!country) throw new Error("Country is required.");
    if (!city) throw new Error("City is required.");

    return {
      locationType: "INTERNATIONAL" as const,
      country,
      governorate: null,
      wilayat: null,
      region: region ?? null,
      city,
    };
  }

  const governorate = String(formData.get("governorate") ?? "").trim();
  const wilayat = String(formData.get("wilayat") ?? "").trim();

  if (!governorate) throw new Error("Governorate is required.");
  if (!wilayat) throw new Error("Wilayat is required.");

  return {
    locationType: "OMAN" as const,
    country: "Oman",
    governorate,
    wilayat,
    region: null,
    city: null,
  };
}

export async function createLand(formData: FormData) {
  const ctx = await requireModuleAccess("LANDS");
  if (!canWrite(ctx, "LANDS")) {
    throw new Error("You do not have permission to register land.");
  }

  const name = parseOrThrow(zRequiredString("Land name"), formData.get("name") ?? "");
  const locationFields = readLandLocationFromForm(formData);
  const entityId = parseOrThrow(zRequiredString("Entity"), formData.get("entityId") ?? "");
  const status = assertEnumValue(
    String(formData.get("status") ?? "ACTIVE"),
    ASSET_STATUS_VALUES,
    "Status",
  );

  assertStatusNotExited(status);

  if (ctx.entityIds.length > 0 && !ctx.entityIds.includes(entityId)) {
    if (ctx.role !== "PRINCIPAL") {
      throw new Error("You do not have access to this entity.");
    }
  }

  const village = String(formData.get("village") ?? "").trim() || undefined;
  const plotNumber = String(formData.get("plotNumber") ?? "").trim() || undefined;
  const krookiNumber = String(formData.get("krookiNumber") ?? "").trim() || undefined;
  const mulkiaNumber = String(formData.get("mulkiaNumber") ?? "").trim() || undefined;
  const landUse = String(formData.get("landUse") ?? "").trim() || undefined;
  const coordinates = String(formData.get("coordinates") ?? "").trim() || undefined;
  const holders = parseHoldersJson(String(formData.get("holdersJson") ?? ""));
  const registeredHolder = formatRegisteredHolderSummary(holders);
  const notes = String(formData.get("notes") ?? "").trim() || undefined;
  const currency = String(formData.get("currency") ?? "OMR").trim() || "OMR";
  const ownershipPct =
    parseOrThrow(zOptionalDecimal("Ownership %", { min: 0, max: 100 }), formData.get("ownershipPct") ?? "100") ??
    "100";
  const areaSqm = parseOrThrow(zOptionalDecimal("Area", { min: 0 }), formData.get("areaSqm") ?? "");
  const acquisitionCost = parseOrThrow(
    zOptionalDecimal("Acquisition cost", { min: 0 }),
    formData.get("acquisitionCost") ?? "",
  );
  const currentValue = parseOrThrow(zOptionalDecimal("Current value", { min: 0 }), formData.get("currentValue") ?? "");
  const acquisitionDate = parseOrThrow(zOptionalDate("Acquisition date"), formData.get("acquisitionDate") ?? "");

  const location = buildLocation(locationFields, village);

  const land = await db.$transaction(async (tx) => {
    const asset = await tx.asset.create({
      data: {
        name,
        category: "REAL_ESTATE",
        status,
        entityId,
        currency,
        acquisitionDate,
        acquisitionCost,
        currentValue,
        ownershipPct,
        description: notes,
        valueUpdatedAt: currentValue ? new Date() : undefined,
        realEstate: {
          create: {
            plotNumber,
            location,
            titleDeed: mulkiaNumber,
            isEmptyLand: true,
          },
        },
      },
    });

    const created = await tx.landParcel.create({
      data: {
        name,
        locationType: locationFields.locationType,
        country: locationFields.country,
        governorate: locationFields.governorate,
        wilayat: locationFields.wilayat,
        region: locationFields.region,
        city: locationFields.city,
        village,
        plotNumber,
        krookiNumber,
        mulkiaNumber,
        landUse,
        areaSqm,
        coordinates,
        acquisitionDate,
        acquisitionCost,
        currentValue,
        currency,
        ownershipPct,
        registeredHolder,
        status,
        notes,
        entityId,
        assetId: asset.id,
      },
    });

    await replaceLandHolders(tx, created.id, holders);
    return created;
  });

  const krookiFiles = getFilesFromFormData(formData, "krookiFiles");
  const mulkiaFiles = getFilesFromFormData(formData, "mulkiaFiles");
  const otherFiles = getFilesFromFormData(formData, "otherFiles");

  if (krookiFiles.length + mulkiaFiles.length + otherFiles.length > 0) {
    if (krookiFiles.length) await uploadLandFiles(land.id, krookiFiles, "KROOKI", ctx.id);
    if (mulkiaFiles.length) await uploadLandFiles(land.id, mulkiaFiles, "MULKIA", ctx.id);
    if (otherFiles.length) await uploadLandFiles(land.id, otherFiles, "OTHER", ctx.id, "Other document");
  }

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "LandParcel",
    resourceId: land.id,
    metadata: {
      name: land.name,
      locationType: land.locationType,
      country: land.country,
    },
  });

  revalidatePath("/lands");
  revalidatePath("/assets");
  return land;
}

export async function uploadLandDocuments(formData: FormData) {
  const ctx = await requireModuleAccess("LANDS");
  if (!canWrite(ctx, "LANDS")) {
    throw new Error("You do not have permission to upload land documents.");
  }

  const landParcelId = String(formData.get("landParcelId") ?? "").trim();
  const documentType = String(formData.get("documentType") ?? "") as LandDocumentType;

  if (!landParcelId) throw new Error("Land parcel is required.");
  if (!documentType) throw new Error("Document type is required.");

  const land = await db.landParcel.findFirst({
    where: { id: landParcelId, ...landEntityFilter(ctx) },
  });
  if (!land) throw new Error("Land parcel not found.");

  const field =
    documentType === "KROOKI" ? "krookiFiles" : documentType === "MULKIA" ? "mulkiaFiles" : "otherFiles";

  const files = getFilesFromFormData(formData, field);
  if (files.length === 0) throw new Error("At least one file is required.");

  await uploadLandFiles(
    landParcelId,
    files,
    documentType,
    ctx.id,
    documentType === "OTHER" ? "Other document" : undefined,
  );

  await logAudit({
    userId: ctx.id,
    action: "UPLOAD",
    resource: "LandDocument",
    resourceId: landParcelId,
    metadata: { documentType, count: files.length, fileNames: files.map((f) => f.name) },
  });

  revalidatePath("/lands/" + landParcelId);
  revalidatePath("/lands");
}

export async function listLands() {
  const ctx = await requireModuleAccess("LANDS");
  return db.landParcel.findMany({
    where: landEntityFilter(ctx),
    include: {
      entity: true,
      documents: { select: { id: true, documentType: true } },
      registeredHolders: { orderBy: { sortOrder: "asc" } },
      sale: { select: { id: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getLand(id: string) {
  const ctx = await requireModuleAccess("LANDS");
  return db.landParcel.findFirst({
    where: { id, ...landEntityFilter(ctx) },
    include: {
      entity: true,
      documents: { orderBy: { createdAt: "desc" } },
      registeredHolders: { orderBy: { sortOrder: "asc" } },
      asset: { include: { exit: { include: { documents: { orderBy: { createdAt: "desc" } } } } } },
      sale: {
        include: {
          documents: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  });
}

export async function deleteLandDocument(id: string) {
  const ctx = await requireModuleAccess("LANDS");
  if (!canWrite(ctx, "LANDS")) {
    throw new Error("You do not have permission to delete land documents.");
  }

  const document = await db.landDocument.findFirst({
    where: {
      id,
      landParcel: landEntityFilter(ctx),
    },
    include: { landParcel: true },
  });
  if (!document) throw new Error("Document not found.");

  await deleteBlobUrl(document.fileUrl);
  await db.landDocument.delete({ where: { id } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "LandDocument",
    resourceId: id,
    metadata: { landParcelId: document.landParcelId, fileName: document.fileName },
  });

  revalidatePath("/lands/" + document.landParcelId);
  revalidatePath("/lands");
}

export async function deleteLand(id: string) {
  const ctx = await requireModuleAccess("LANDS");
  if (!canWrite(ctx, "LANDS")) {
    throw new Error("You do not have permission to delete land.");
  }

  const land = await db.landParcel.findFirst({
    where: { id, ...landEntityFilter(ctx) },
    include: { documents: true, sale: { include: { documents: true } } },
  });
  if (!land) throw new Error("Land parcel not found.");

  for (const doc of land.documents) {
    await deleteBlobUrl(doc.fileUrl);
  }
  if (land.sale) {
    for (const doc of land.sale.documents) {
      await deleteBlobUrl(doc.fileUrl);
    }
  }

  const assetId = land.assetId;
  await db.landParcel.delete({ where: { id } });

  if (assetId) {
    await db.asset.delete({ where: { id: assetId } });
  }

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "LandParcel",
    resourceId: id,
    metadata: { name: land.name },
  });

  revalidatePath("/lands");
  revalidatePath("/assets");
}

export async function updateLand(id: string, formData: FormData) {
  const ctx = await requireModuleAccess("LANDS");
  if (!canWrite(ctx, "LANDS")) {
    throw new Error("You do not have permission to update land.");
  }

  const land = await db.landParcel.findFirst({
    where: { id, ...landEntityFilter(ctx) },
    include: { asset: { include: { realEstate: true } } },
  });
  if (!land) throw new Error("Land parcel not found.");

  const name = parseOrThrow(zRequiredString("Land name"), formData.get("name") ?? "");
  const locationFields = readLandLocationFromForm(formData);
  const entityId = parseOrThrow(zRequiredString("Entity"), formData.get("entityId") ?? "");
  const status = assertEnumValue(
    String(formData.get("status") ?? "ACTIVE"),
    ASSET_STATUS_VALUES,
    "Status",
  );

  assertStatusNotExited(status);

  if (ctx.entityIds.length > 0 && !ctx.entityIds.includes(entityId)) {
    if (ctx.role !== "PRINCIPAL" && !ctx.isSuperAdmin) {
      throw new Error("You do not have access to this entity.");
    }
  }

  const village = String(formData.get("village") ?? "").trim() || undefined;
  const plotNumber = String(formData.get("plotNumber") ?? "").trim() || undefined;
  const krookiNumber = String(formData.get("krookiNumber") ?? "").trim() || undefined;
  const mulkiaNumber = String(formData.get("mulkiaNumber") ?? "").trim() || undefined;
  const landUse = String(formData.get("landUse") ?? "").trim() || undefined;
  const coordinates = String(formData.get("coordinates") ?? "").trim() || undefined;
  const holders = parseHoldersJson(String(formData.get("holdersJson") ?? ""));
  const registeredHolder = formatRegisteredHolderSummary(holders);
  const notes = String(formData.get("notes") ?? "").trim() || undefined;
  const currency = String(formData.get("currency") ?? "OMR").trim() || "OMR";
  const ownershipPct =
    parseOrThrow(zOptionalDecimal("Ownership %", { min: 0, max: 100 }), formData.get("ownershipPct") ?? "100") ??
    "100";
  const areaSqm = parseOrThrow(zOptionalDecimal("Area", { min: 0 }), formData.get("areaSqm") ?? "");
  const acquisitionCost = parseOrThrow(
    zOptionalDecimal("Acquisition cost", { min: 0 }),
    formData.get("acquisitionCost") ?? "",
  );
  const currentValue = parseOrThrow(zOptionalDecimal("Current value", { min: 0 }), formData.get("currentValue") ?? "");
  const acquisitionDate = parseOrThrow(zOptionalDate("Acquisition date"), formData.get("acquisitionDate") ?? "");

  const location = buildLocation(locationFields, village);

  const updated = await db.$transaction(async (tx) => {
    const result = await tx.landParcel.update({
      where: { id },
      data: {
        name,
        locationType: locationFields.locationType,
        country: locationFields.country,
        governorate: locationFields.governorate,
        wilayat: locationFields.wilayat,
        region: locationFields.region,
        city: locationFields.city,
        village,
        plotNumber,
        krookiNumber,
        mulkiaNumber,
        landUse,
        areaSqm,
        coordinates,
        acquisitionDate,
        acquisitionCost,
        currentValue,
        currency,
        ownershipPct,
        registeredHolder,
        status,
        notes,
        entityId,
      },
    });

    if (land.assetId) {
      await tx.asset.update({
        where: { id: land.assetId },
        data: {
          name,
          status,
          entityId,
          currency,
          acquisitionDate,
          acquisitionCost,
          currentValue,
          ownershipPct,
          description: notes,
          valueUpdatedAt: currentValue ? new Date() : land.asset?.valueUpdatedAt,
          realEstate: {
            update: {
              plotNumber,
              location,
              titleDeed: mulkiaNumber,
            },
          },
        },
      });
    }

    await replaceLandHolders(tx, id, holders);
    return result;
  });

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "LandParcel",
    resourceId: id,
    metadata: { name: updated.name },
  });

  revalidatePath("/lands");
  revalidatePath("/lands/" + id);
  revalidatePath("/lands/" + id + "/edit");
  revalidatePath("/assets");
  return updated;
}

export async function recordLandSale(formData: FormData) {
  const ctx = await requireModuleAccess("LANDS");
  if (!canWrite(ctx, "LANDS")) {
    throw new Error("You do not have permission to record land sales.");
  }

  const landParcelId = parseOrThrow(zRequiredString("Land parcel"), formData.get("landParcelId") ?? "");
  const soldTo = parseOrThrow(zRequiredString("Buyer name"), formData.get("soldTo") ?? "");
  const saleDate = parseOrThrow(zRequiredDate("Sale date"), formData.get("saleDate") ?? "");
  const saleAmount = parseOrThrow(
    zRequiredDecimal("Sale amount", { min: 0 }),
    formData.get("saleAmount") ?? "",
  );
  const currency = String(formData.get("currency") ?? "OMR").trim() || "OMR";
  const notes = String(formData.get("notes") ?? "").trim() || undefined;

  const land = await db.landParcel.findFirst({
    where: { id: landParcelId, ...landEntityFilter(ctx) },
    include: { sale: true, asset: true },
  });
  if (!land) throw new Error("Land parcel not found.");
  if (land.sale) throw new Error("This land parcel already has a recorded sale.");

  // The exit-record path below runs its own transaction against the asset, so the
  // sale row and the (non-asset-linked) status flip are grouped separately here.
  const sale = await db.landSale.create({
    data: {
      landParcelId,
      saleDate,
      soldTo,
      saleAmount,
      currency,
      notes,
      recordedById: ctx.id,
    },
  });

  if (land.assetId) {
    await createAssetExitRecord({
      assetId: land.assetId,
      exitType: "SALE",
      exitDate: saleDate,
      proceeds: saleAmount,
      currency,
      counterparty: soldTo,
      notes,
      recordedById: ctx.id,
      landSaleId: sale.id,
    });
  } else {
    await db.landParcel.update({
      where: { id: landParcelId },
      data: { status: "EXITED" },
    });
  }

  const poaFiles = getFilesFromFormData(formData, "poaFiles");
  const spaFiles = getFilesFromFormData(formData, "spaFiles");
  const buyerIdFiles = getFilesFromFormData(formData, "buyerIdFiles");
  const otherSaleFiles = getFilesFromFormData(formData, "otherSaleFiles");

  if (poaFiles.length) {
    await uploadLandSaleFiles(sale.id, landParcelId, poaFiles, "POWER_OF_ATTORNEY", ctx.id);
  }
  if (spaFiles.length) {
    await uploadLandSaleFiles(sale.id, landParcelId, spaFiles, "SPA", ctx.id);
  }
  if (buyerIdFiles.length) {
    await uploadLandSaleFiles(sale.id, landParcelId, buyerIdFiles, "BUYER_ID", ctx.id);
  }
  if (otherSaleFiles.length) {
    await uploadLandSaleFiles(sale.id, landParcelId, otherSaleFiles, "OTHER", ctx.id, "Other document");
  }

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "LandSale",
    resourceId: sale.id,
    metadata: { landParcelId, soldTo, saleAmount },
  });

  revalidatePath("/lands");
  revalidatePath("/lands/" + landParcelId);
  revalidatePath("/assets");
  if (land.assetId) revalidatePath("/assets/" + land.assetId);
  revalidatePath("/dashboard");
  return sale;
}

export async function uploadLandSaleDocuments(formData: FormData) {
  const ctx = await requireModuleAccess("LANDS");
  if (!canWrite(ctx, "LANDS")) {
    throw new Error("You do not have permission to upload sale documents.");
  }

  const landParcelId = String(formData.get("landParcelId") ?? "").trim();
  const documentType = String(formData.get("documentType") ?? "") as LandSaleDocumentType;
  if (!landParcelId) throw new Error("Land parcel is required.");
  if (!documentType) throw new Error("Document type is required.");

  const land = await db.landParcel.findFirst({
    where: { id: landParcelId, ...landEntityFilter(ctx) },
    include: { sale: true },
  });
  if (!land) throw new Error("Land parcel not found.");
  if (!land.sale) throw new Error("No sale recorded for this land parcel.");

  const field =
    documentType === "POWER_OF_ATTORNEY"
      ? "poaFiles"
      : documentType === "SPA"
        ? "spaFiles"
        : documentType === "BUYER_ID"
          ? "buyerIdFiles"
          : "otherSaleFiles";

  const files = getFilesFromFormData(formData, field);
  if (files.length === 0) throw new Error("At least one file is required.");

  await uploadLandSaleFiles(
    land.sale.id,
    landParcelId,
    files,
    documentType,
    ctx.id,
    documentType === "OTHER" ? "Other document" : undefined,
  );

  await logAudit({
    userId: ctx.id,
    action: "UPLOAD",
    resource: "LandSaleDocument",
    resourceId: land.sale.id,
    metadata: { documentType, count: files.length, fileNames: files.map((f) => f.name) },
  });

  revalidatePath("/lands/" + landParcelId);
  revalidatePath("/lands");
}

export async function deleteLandSaleDocument(id: string) {
  const ctx = await requireModuleAccess("LANDS");
  if (!canWrite(ctx, "LANDS")) {
    throw new Error("You do not have permission to delete sale documents.");
  }

  const document = await db.landSaleDocument.findFirst({
    where: { id, landSale: { landParcel: landEntityFilter(ctx) } },
    include: { landSale: true },
  });
  if (!document) throw new Error("Document not found.");

  await deleteBlobUrl(document.fileUrl);
  await db.landSaleDocument.delete({ where: { id } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "LandSaleDocument",
    resourceId: id,
    metadata: { landParcelId: document.landSale.landParcelId, fileName: document.fileName },
  });

  revalidatePath("/lands/" + document.landSale.landParcelId);
  revalidatePath("/lands");
}
