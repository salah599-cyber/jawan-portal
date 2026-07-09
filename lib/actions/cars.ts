"use server";

import { assertStatusNotExited } from "@/lib/assets/status";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { deleteBlobUrl, uploadPrivateFile } from "@/lib/blob";
import { logAudit } from "@/lib/audit/log";
import { recordAssetValuation } from "@/lib/portfolio/valuations";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { carEntityFilter } from "@/lib/permissions/scoped-queries";
import type { AssetStatus, VehicleDocumentType } from "@/lib/generated/prisma/client";

function parseDecimal(value?: string | null) {
  if (!value || value.trim() === "") return undefined;
  return value.trim();
}

function parseDate(value?: string | null) {
  if (!value || value.trim() === "") return undefined;
  return new Date(value);
}

function parseIntOptional(value?: string | null) {
  if (!value || value.trim() === "") return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? undefined : n;
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function uploadVehicleFiles(
  vehicleId: string,
  files: File[],
  documentType: VehicleDocumentType,
  uploadedById: string,
  labelPrefix?: string,
) {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!(file instanceof File) || file.size === 0) continue;

    const uploaded = await uploadPrivateFile(
      ["cars", vehicleId, documentType.toLowerCase()],
      file,
    );
    try {
      await db.vehicleDocument.create({
        data: {
          vehicleId,
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

function buildVehicleDescription(make: string, model: string, plateNumber: string, plateCode?: string) {
  const plate = [plateCode, plateNumber].filter(Boolean).join(" ");
  return [make, model, plate ? "Plate " + plate : ""].filter(Boolean).join(" - ");
}

function readVehicleFormData(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const plateNumber = String(formData.get("plateNumber") ?? "").trim();
  const plateCode = String(formData.get("plateCode") ?? "").trim() || undefined;
  const governorate = String(formData.get("governorate") ?? "").trim();
  const wilayat = String(formData.get("wilayat") ?? "").trim();
  const entityId = String(formData.get("entityId") ?? "").trim();
  const status = String(formData.get("status") ?? "ACTIVE") as AssetStatus;
  const make = String(formData.get("make") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();

  if (!name) throw new Error("Vehicle name is required.");
  if (!plateNumber) throw new Error("Plate number is required.");
  if (!governorate) throw new Error("Governorate is required.");
  if (!wilayat) throw new Error("Wilayat is required.");
  if (!entityId) throw new Error("Entity is required.");
  if (!make) throw new Error("Make is required.");
  if (!model) throw new Error("Model is required.");

  assertStatusNotExited(status);

  return {
    name,
    plateNumber,
    plateCode,
    governorate,
    wilayat,
    entityId,
    status,
    make,
    model,
    modelYear: parseIntOptional(String(formData.get("modelYear") ?? "")),
    color: String(formData.get("color") ?? "").trim() || undefined,
    vehicleClass: String(formData.get("vehicleClass") ?? "").trim() || undefined,
    bodyType: String(formData.get("bodyType") ?? "").trim() || undefined,
    fuelType: String(formData.get("fuelType") ?? "").trim() || undefined,
    chassisNumber: String(formData.get("chassisNumber") ?? "").trim() || undefined,
    engineNumber: String(formData.get("engineNumber") ?? "").trim() || undefined,
    mulkiaNumber: String(formData.get("mulkiaNumber") ?? "").trim() || undefined,
    registeredOwner: String(formData.get("registeredOwner") ?? "").trim() || undefined,
    registrationIssueDate: parseDate(String(formData.get("registrationIssueDate") ?? "")),
    registrationExpiryDate: parseDate(String(formData.get("registrationExpiryDate") ?? "")),
    insuranceCompany: String(formData.get("insuranceCompany") ?? "").trim() || undefined,
    insurancePolicyNumber: String(formData.get("insurancePolicyNumber") ?? "").trim() || undefined,
    insuranceExpiryDate: parseDate(String(formData.get("insuranceExpiryDate") ?? "")),
    acquisitionDate: parseDate(String(formData.get("acquisitionDate") ?? "")),
    acquisitionCost: parseDecimal(String(formData.get("acquisitionCost") ?? "")),
    currentValue: parseDecimal(String(formData.get("currentValue") ?? "")),
    currency: String(formData.get("currency") ?? "OMR").trim() || "OMR",
    ownershipPct: parseDecimal(String(formData.get("ownershipPct") ?? "100")) ?? "100",
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  };
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

export async function createCar(formData: FormData) {
  const ctx = await requireModuleAccess("CARS");
  if (!canWrite(ctx, "CARS")) {
    throw new Error("You do not have permission to register vehicles.");
  }

  const data = readVehicleFormData(formData);
  assertEntityAccess(ctx, data.entityId);

  const asset = await db.asset.create({
    data: {
      name: data.name,
      category: "FIXED_ASSET",
      status: data.status,
      entityId: data.entityId,
      currency: data.currency,
      acquisitionDate: data.acquisitionDate,
      acquisitionCost: data.acquisitionCost,
      currentValue: data.currentValue,
      ownershipPct: data.ownershipPct,
      description: data.notes,
      valueUpdatedAt: data.currentValue ? new Date() : undefined,
      fixedAsset: {
        create: {
          assetType: "VEHICLE",
          condition: data.color,
          reportNotes: buildVehicleDescription(data.make, data.model, data.plateNumber, data.plateCode),
        },
      },
    },
  });

  if (data.currentValue) {
    const value = parseFloat(data.currentValue);
    if (!Number.isNaN(value) && value > 0) {
      await recordAssetValuation({
        assetId: asset.id,
        value,
        currency: data.currency,
        valuedAt: data.acquisitionDate ?? new Date(),
      });
    }
  }

  const vehicle = await db.vehicle.create({
    data: {
      ...data,
      assetId: asset.id,
    },
  });

  const mulkiaFiles = getFilesFromFormData(formData, "mulkiaFiles");
  const insuranceFiles = getFilesFromFormData(formData, "insuranceFiles");
  const otherFiles = getFilesFromFormData(formData, "otherFiles");

  if (mulkiaFiles.length) await uploadVehicleFiles(vehicle.id, mulkiaFiles, "MULKIA", ctx.id);
  if (insuranceFiles.length) await uploadVehicleFiles(vehicle.id, insuranceFiles, "INSURANCE", ctx.id);
  if (otherFiles.length) await uploadVehicleFiles(vehicle.id, otherFiles, "OTHER", ctx.id, "Other document");

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "Vehicle",
    resourceId: vehicle.id,
    metadata: { name: vehicle.name, plateNumber: vehicle.plateNumber },
  });

  revalidatePath("/cars");
  revalidatePath("/assets");
  return vehicle;
}

export async function updateCar(id: string, formData: FormData) {
  const ctx = await requireModuleAccess("CARS");
  if (!canWrite(ctx, "CARS")) {
    throw new Error("You do not have permission to update vehicles.");
  }

  const existing = await db.vehicle.findFirst({
    where: { id, ...carEntityFilter(ctx) },
    include: { asset: true },
  });
  if (!existing) throw new Error("Vehicle not found.");

  const data = readVehicleFormData(formData);
  assertEntityAccess(ctx, data.entityId);

  const vehicle = await db.vehicle.update({
    where: { id },
    data,
  });

  if (existing.assetId) {
    await db.asset.update({
      where: { id: existing.assetId },
      data: {
        name: data.name,
        status: data.status,
        entityId: data.entityId,
        currency: data.currency,
        acquisitionDate: data.acquisitionDate,
        acquisitionCost: data.acquisitionCost,
        currentValue: data.currentValue,
        ownershipPct: data.ownershipPct,
        description: data.notes,
        valueUpdatedAt: data.currentValue ? new Date() : existing.asset?.valueUpdatedAt,
        fixedAsset: {
          update: {
            assetType: "VEHICLE",
            condition: data.color,
            reportNotes: buildVehicleDescription(data.make, data.model, data.plateNumber, data.plateCode),
          },
        },
      },
    });

    if (data.currentValue) {
      const value = parseFloat(data.currentValue);
      if (!Number.isNaN(value) && value > 0) {
        await recordAssetValuation({
          assetId: existing.assetId,
          value,
          currency: data.currency,
        });
      }
    }
  }

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "Vehicle",
    resourceId: id,
    metadata: { name: vehicle.name },
  });

  revalidatePath("/cars");
  revalidatePath("/cars/" + id);
  revalidatePath("/cars/" + id + "/edit");
  revalidatePath("/assets");
  return vehicle;
}

export async function uploadCarDocuments(formData: FormData) {
  const ctx = await requireModuleAccess("CARS");
  if (!canWrite(ctx, "CARS")) {
    throw new Error("You do not have permission to upload vehicle documents.");
  }

  const vehicleId = String(formData.get("vehicleId") ?? "").trim();
  const documentType = String(formData.get("documentType") ?? "") as VehicleDocumentType;
  if (!vehicleId) throw new Error("Vehicle is required.");
  if (!documentType) throw new Error("Document type is required.");

  const vehicle = await db.vehicle.findFirst({
    where: { id: vehicleId, ...carEntityFilter(ctx) },
  });
  if (!vehicle) throw new Error("Vehicle not found.");

  const field =
    documentType === "MULKIA"
      ? "mulkiaFiles"
      : documentType === "INSURANCE"
        ? "insuranceFiles"
        : "otherFiles";

  const files = getFilesFromFormData(formData, field);
  if (files.length === 0) throw new Error("At least one file is required.");

  await uploadVehicleFiles(
    vehicleId,
    files,
    documentType,
    ctx.id,
    documentType === "OTHER" ? "Other document" : undefined,
  );

  await logAudit({
    userId: ctx.id,
    action: "UPLOAD",
    resource: "VehicleDocument",
    resourceId: vehicleId,
    metadata: { documentType, count: files.length },
  });

  revalidatePath("/cars/" + vehicleId);
  revalidatePath("/cars");
}

export async function listCars() {
  const ctx = await requireModuleAccess("CARS");
  return db.vehicle.findMany({
    where: carEntityFilter(ctx),
    include: {
      entity: true,
      documents: { select: { id: true, documentType: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getCar(id: string) {
  const ctx = await requireModuleAccess("CARS");
  return db.vehicle.findFirst({
    where: { id, ...carEntityFilter(ctx) },
    include: {
      entity: true,
      documents: { orderBy: { createdAt: "desc" } },
      asset: { include: { exit: { include: { documents: { orderBy: { createdAt: "desc" } } } } } },
    },
  });
}

export async function deleteCarDocument(id: string) {
  const ctx = await requireModuleAccess("CARS");
  if (!canWrite(ctx, "CARS")) {
    throw new Error("You do not have permission to delete vehicle documents.");
  }

  const document = await db.vehicleDocument.findFirst({
    where: { id, vehicle: carEntityFilter(ctx) },
  });
  if (!document) throw new Error("Document not found.");

  await deleteBlobUrl(document.fileUrl);
  await db.vehicleDocument.delete({ where: { id } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "VehicleDocument",
    resourceId: id,
    metadata: { vehicleId: document.vehicleId },
  });

  revalidatePath("/cars/" + document.vehicleId);
  revalidatePath("/cars");
}

export async function deleteCar(id: string) {
  const ctx = await requireModuleAccess("CARS");
  if (!canWrite(ctx, "CARS")) {
    throw new Error("You do not have permission to delete vehicles.");
  }

  const vehicle = await db.vehicle.findFirst({
    where: { id, ...carEntityFilter(ctx) },
    include: { documents: true },
  });
  if (!vehicle) throw new Error("Vehicle not found.");

  for (const doc of vehicle.documents) {
    await deleteBlobUrl(doc.fileUrl);
  }

  const assetId = vehicle.assetId;
  await db.vehicle.delete({ where: { id } });
  if (assetId) await db.asset.delete({ where: { id: assetId } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "Vehicle",
    resourceId: id,
    metadata: { name: vehicle.name },
  });

  revalidatePath("/cars");
  revalidatePath("/assets");
}
