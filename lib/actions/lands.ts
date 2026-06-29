"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { deleteBlobUrl } from "@/lib/blob";
import { logAudit } from "@/lib/audit/log";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { landEntityFilter } from "@/lib/permissions/scoped-queries";
import type { AssetStatus, LandDocumentType } from "@/lib/generated/prisma/client";

function parseDecimal(value?: string | null) {
  if (!value || value.trim() === "") return undefined;
  return value.trim();
}

function parseDate(value?: string | null) {
  if (!value || value.trim() === "") return undefined;
  return new Date(value);
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function uploadLandFiles(
  landParcelId: string,
  files: File[],
  documentType: LandDocumentType,
  uploadedById: string,
  labelPrefix?: string,
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
      "lands/" +
      landParcelId +
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

    const doc = await db.landDocument.create({
      data: {
        landParcelId,
        documentType,
        label: labelPrefix ? labelPrefix + " " + (i + 1) : file.name,
        fileName: file.name,
        fileUrl: blob.url,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        uploadedById,
      },
    });
    created.push(doc);
  }
  return created;
}

function getFilesFromFormData(formData: FormData, field: string): File[] {
  return formData
    .getAll(field)
    .filter((item): item is File => item instanceof File && item.size > 0);
}

function buildLocation(governorate: string, wilayat: string, village?: string) {
  return [village, wilayat, governorate].filter(Boolean).join(", ");
}

export async function createLand(formData: FormData) {
  const ctx = await requireModuleAccess("LANDS");
  if (!canWrite(ctx, "LANDS")) {
    throw new Error("You do not have permission to register land.");
  }

  const name = String(formData.get("name") ?? "").trim();
  const governorate = String(formData.get("governorate") ?? "").trim();
  const wilayat = String(formData.get("wilayat") ?? "").trim();
  const entityId = String(formData.get("entityId") ?? "").trim();
  const status = String(formData.get("status") ?? "ACTIVE") as AssetStatus;

  if (!name) throw new Error("Land name is required.");
  if (!governorate) throw new Error("Governorate is required.");
  if (!wilayat) throw new Error("Wilayat is required.");
  if (!entityId) throw new Error("Entity is required.");

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
  const registeredHolder = String(formData.get("registeredHolder") ?? "").trim() || undefined;
  const notes = String(formData.get("notes") ?? "").trim() || undefined;
  const currency = String(formData.get("currency") ?? "OMR").trim() || "OMR";
  const ownershipPct = parseDecimal(String(formData.get("ownershipPct") ?? "100")) ?? "100";
  const areaSqm = parseDecimal(String(formData.get("areaSqm") ?? ""));
  const acquisitionCost = parseDecimal(String(formData.get("acquisitionCost") ?? ""));
  const currentValue = parseDecimal(String(formData.get("currentValue") ?? ""));
  const acquisitionDate = parseDate(String(formData.get("acquisitionDate") ?? ""));

  const location = buildLocation(governorate, wilayat, village);

  const asset = await db.asset.create({
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

  const land = await db.landParcel.create({
    data: {
      name,
      governorate,
      wilayat,
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
    metadata: { name: land.name, governorate, wilayat },
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
    metadata: { documentType, count: files.length },
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
      asset: true,
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
    include: { documents: true },
  });
  if (!land) throw new Error("Land parcel not found.");

  for (const doc of land.documents) {
    await deleteBlobUrl(doc.fileUrl);
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
