"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { deleteBlobUrl } from "@/lib/blob";
import { logAudit } from "@/lib/audit/log";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { assetEntityFilter } from "@/lib/permissions/scoped-queries";
import { assertStatusNotExited } from "@/lib/assets/status";
import { resolveAssetCategoryId } from "@/lib/data/asset-categories";
import type { AssetCategory, AssetDocumentType, AssetStatus } from "@/lib/generated/prisma/client";

export type CreateAssetInput = {
  name: string;
  categoryId: string;
  entityId: string;
  status: AssetStatus;
  currency: string;
  acquisitionDate?: string;
  acquisitionCost?: string;
  currentValue?: string;
  description?: string;
  managerName?: string;
  managerEmail?: string;
};

function categoryDetailCreate(category: AssetCategory) {
  switch (category) {
    case "REAL_ESTATE":
      return { realEstate: { create: {} } };
    case "PRIVATE_EQUITY":
      return { privateEquity: { create: {} } };
    case "FIXED_ASSET":
      return { fixedAsset: { create: {} } };
    case "BONDS":
      return { bond: { create: {} } };
    case "CASH":
      return { cash: { create: {} } };
    case "PUBLIC_EQUITY":
    case "OTHER":
    default:
      return { custom: { create: {} } };
  }
}

function parseDecimal(value?: string) {
  if (!value || value.trim() === "") return undefined;
  return value.trim();
}

function parseDate(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date.");
  return date;
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getFilesFromFormData(formData: FormData, field: string): File[] {
  return formData
    .getAll(field)
    .filter((item): item is File => item instanceof File && item.size > 0);
}

async function uploadAssetFiles(
  assetId: string,
  files: File[],
  documentType: AssetDocumentType,
  uploadedById: string,
  options?: { isPrimary?: boolean; notes?: string },
) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not configured. Document uploads require Vercel Blob storage.",
    );
  }

  if (options?.isPrimary && documentType === "PHOTO") {
    await db.assetDocument.updateMany({
      where: { assetId, documentType: "PHOTO", isPrimary: true },
      data: { isPrimary: false },
    });
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!(file instanceof File) || file.size === 0) continue;

    const pathname =
      "assets/" +
      assetId +
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

    await db.assetDocument.create({
      data: {
        assetId,
        documentType,
        fileName: file.name,
        fileUrl: blob.url,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        uploadedById,
        isPrimary: options?.isPrimary === true && i === 0 && documentType === "PHOTO",
        notes: options?.notes,
      },
    });
  }
}

export async function createAsset(input: CreateAssetInput) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to create assets.");
  }

  if (ctx.entityIds.length > 0 && !ctx.entityIds.includes(input.entityId)) {
    const level = ctx.overrides.ASSETS ?? undefined;
    if (level === "FILTERED" || (ctx.entityIds.length > 0 && ctx.role !== "PRINCIPAL")) {
      throw new Error("You do not have access to this entity.");
    }
  }

  assertStatusNotExited(input.status);
  const categoryRecord = await resolveAssetCategoryId(input.categoryId);

  const asset = await db.asset.create({
    data: {
      name: input.name.trim(),
      category: categoryRecord.categoryKind,
      categoryId: categoryRecord.id,
      entityId: input.entityId,
      status: input.status,
      currency: input.currency || "OMR",
      acquisitionDate: parseDate(input.acquisitionDate),
      acquisitionCost: parseDecimal(input.acquisitionCost),
      currentValue: parseDecimal(input.currentValue),
      description: input.description?.trim() || undefined,
      managerName: input.managerName?.trim() || undefined,
      managerEmail: input.managerEmail?.trim() || undefined,
      ...categoryDetailCreate(categoryRecord.categoryKind),
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "Asset",
    resourceId: asset.id,
    metadata: { name: asset.name, category: asset.category, categoryId: asset.categoryId },
  });

  revalidatePath("/assets");
  return asset;
}

export async function listAssets(filter: "all" | "active" | "exited" = "all") {
  const ctx = await requireModuleAccess("ASSETS");
  const statusFilter =
    filter === "active"
      ? { status: { not: "EXITED" as const } }
      : filter === "exited"
        ? { status: "EXITED" as const }
        : {};

  return db.asset.findMany({
    where: { ...assetEntityFilter(ctx), ...statusFilter },
    include: {
      entity: true,
      categoryRecord: { select: { name: true } },
      exit: true,
      landParcel: { select: { id: true } },
      vehicle: { select: { id: true } },
      registeredCompany: { select: { id: true } },
      assetDocuments: {
        where: { documentType: "PHOTO", isPrimary: true },
        take: 1,
        select: { fileUrl: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function deleteAsset(id: string) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to delete assets.");
  }

  const asset = await db.asset.findFirst({
    where: { id, ...assetEntityFilter(ctx) },
    include: {
      landParcel: { select: { id: true } },
      vehicle: { select: { id: true } },
      assetDocuments: { select: { fileUrl: true } },
    },
  });
  if (!asset) throw new Error("Asset not found.");
  if (asset.landParcel) {
    throw new Error(
      "This asset is linked to a land parcel. Delete it from the Lands section instead.",
    );
  }
  if (asset.vehicle) {
    throw new Error("This asset is linked to a vehicle. Delete it from the Cars section instead.");
  }

  for (const document of asset.assetDocuments) {
    await deleteBlobUrl(document.fileUrl);
  }

  await db.asset.delete({ where: { id } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "Asset",
    resourceId: id,
    metadata: { name: asset.name, category: asset.category },
  });

  revalidatePath("/assets");
}

export async function getAsset(id: string) {
  const ctx = await requireModuleAccess("ASSETS");
  return db.asset.findFirst({
    where: { id, ...assetEntityFilter(ctx) },
    include: {
      entity: true,
      categoryRecord: { select: { id: true, name: true, categoryKind: true, isSystem: true } },
      assetDocuments: { orderBy: [{ documentType: "asc" }, { createdAt: "desc" }] },
      exit: { include: { documents: { orderBy: { createdAt: "desc" } } } },
      landParcel: { select: { id: true, sale: { select: { id: true } } } },
      vehicle: { select: { id: true } },
      registeredCompany: { select: { id: true } },
    },
  });
}

export async function updateAsset(id: string, input: CreateAssetInput) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to update assets.");
  }

  const asset = await db.asset.findFirst({
    where: { id, ...assetEntityFilter(ctx) },
    include: {
      landParcel: { select: { id: true } },
      vehicle: { select: { id: true } },
    },
  });
  if (!asset) throw new Error("Asset not found.");
  if (asset.landParcel) {
    throw new Error("This asset is linked to a land parcel. Edit it from the Lands section instead.");
  }
  if (asset.vehicle) {
    throw new Error("This asset is linked to a vehicle. Edit it from the Cars section instead.");
  }

  assertStatusNotExited(input.status);

  if (ctx.entityIds.length > 0 && !ctx.entityIds.includes(input.entityId)) {
    if (ctx.role !== "PRINCIPAL" && !ctx.isSuperAdmin) {
      throw new Error("You do not have access to this entity.");
    }
  }

  const categoryRecord = await resolveAssetCategoryId(input.categoryId);
  const currentValue = parseDecimal(input.currentValue);
  const updated = await db.asset.update({
    where: { id },
    data: {
      name: input.name.trim(),
      category: categoryRecord.categoryKind,
      categoryId: categoryRecord.id,
      entityId: input.entityId,
      status: input.status,
      currency: input.currency || "OMR",
      acquisitionDate: parseDate(input.acquisitionDate),
      acquisitionCost: parseDecimal(input.acquisitionCost),
      currentValue,
      description: input.description?.trim() || undefined,
      managerName: input.managerName?.trim() || undefined,
      managerEmail: input.managerEmail?.trim() || undefined,
      valueUpdatedAt: currentValue ? new Date() : asset.valueUpdatedAt,
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "Asset",
    resourceId: id,
    metadata: { name: updated.name, categoryId: updated.categoryId },
  });

  revalidatePath("/assets");
  revalidatePath("/assets/" + id);
  revalidatePath("/assets/" + id + "/edit");
  return updated;
}

export async function uploadAssetDocuments(formData: FormData) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to upload asset documents.");
  }

  const assetId = String(formData.get("assetId") ?? "").trim();
  const documentType = String(formData.get("documentType") ?? "") as AssetDocumentType;
  const notes = String(formData.get("notes") ?? "").trim() || undefined;
  const setPrimary = String(formData.get("setPrimary") ?? "") === "true";

  if (!assetId) throw new Error("Asset is required.");
  if (!documentType) throw new Error("Document type is required.");

  const asset = await db.asset.findFirst({
    where: { id: assetId, ...assetEntityFilter(ctx) },
  });
  if (!asset) throw new Error("Asset not found.");

  const files = getFilesFromFormData(formData, "files");
  if (files.length === 0) throw new Error("At least one file is required.");

  const hasPrimaryPhoto =
    documentType === "PHOTO" &&
    (setPrimary ||
      !(await db.assetDocument.findFirst({
        where: { assetId, documentType: "PHOTO", isPrimary: true },
      })));

  await uploadAssetFiles(assetId, files, documentType, ctx.id, {
    isPrimary: hasPrimaryPhoto,
    notes,
  });

  await logAudit({
    userId: ctx.id,
    action: "UPLOAD",
    resource: "AssetDocument",
    resourceId: assetId,
    metadata: { documentType, count: files.length },
  });

  revalidatePath("/assets/" + assetId);
  revalidatePath("/assets");
}

export async function deleteAssetDocument(id: string) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to delete asset documents.");
  }

  const document = await db.assetDocument.findFirst({
    where: { id, asset: assetEntityFilter(ctx) },
  });
  if (!document) throw new Error("Document not found.");

  await deleteBlobUrl(document.fileUrl);
  await db.assetDocument.delete({ where: { id } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "AssetDocument",
    resourceId: id,
    metadata: { assetId: document.assetId, documentType: document.documentType },
  });

  revalidatePath("/assets/" + document.assetId);
  revalidatePath("/assets");
}

export async function setPrimaryAssetPhoto(id: string) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to update asset photos.");
  }

  const document = await db.assetDocument.findFirst({
    where: { id, documentType: "PHOTO", asset: assetEntityFilter(ctx) },
  });
  if (!document) throw new Error("Photo not found.");

  await db.$transaction([
    db.assetDocument.updateMany({
      where: { assetId: document.assetId, documentType: "PHOTO", isPrimary: true },
      data: { isPrimary: false },
    }),
    db.assetDocument.update({
      where: { id },
      data: { isPrimary: true },
    }),
  ]);

  revalidatePath("/assets/" + document.assetId);
  revalidatePath("/assets");
}
