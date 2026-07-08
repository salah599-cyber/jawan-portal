"use server";

import { assertStatusNotExited } from "@/lib/assets/status";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { deleteBlobUrl, uploadPrivateFile } from "@/lib/blob";
import { logAudit } from "@/lib/audit/log";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { carEntityFilter } from "@/lib/permissions/scoped-queries";
import {
  assertEnumValue,
  parseOrThrow,
  zOptionalDate,
  zOptionalDecimal,
  zRequiredString,
} from "@/lib/validation/primitives";
import type { AssetStatus, VehicleDocumentType } from "@/lib/generated/prisma/client";

const ASSET_STATUS_VALUES = ["ACTIVE", "MONITOR", "EXITED", "DEFERRED"] as const satisfies readonly AssetStatus[];

function parseIntOptional(value?: string | null) {
  if (!value || value.trim() === "") return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? undefined : n;
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

    const uploaded = await uploadPrivateFile(["cars", vehicleId, documentType.toLowerCase()], file);
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
  const name = parseOrThrow(zRequiredString("Vehicle name"), formData.get("name") ?? "");
  const plateNumber = parseOrThrow(zRequiredString("Plate number"), formData.get("plateNumber") ?? "");
  const plateCode = String(formData.get("plateCode") ?? "").trim() || undefined;
  const governorate = parseOrThrow(zRequiredString("Governorate"), formData.get("governorate") ?? "");
  const wilayat = parseOrThrow(zRequiredString("Wilayat"), formData.get("wilayat") ?? "");
  const entityId = parseOrThrow(zRequiredString("Entity"), formData.get("entityId") ?? "");
  const status = assertEnumValue(String(formData.get("status") ?? "ACTIVE"), ASSET_STATUS_VALUES, "Status");
  const make = parseOrThrow(zRequiredString("Make"), formData.get("make") ?? "");
  const model = parseOrThrow(zRequiredString("Model"), formData.get("model") ?? "");

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
    registrationIssueDate: parseOrThrow(
      zOptionalDate("Registration issue date"),
      formData.get("registrationIssueDate") ?? "",
    ),
    registrationExpiryDate: parseOrThrow(
      zOptionalDate("Registration expiry date"),
      formData.get("registrationExpiryDate") ?? "",
    ),
    insuranceCompany: String(formData.get("insuranceCompany") ?? "").trim() || undefined,
    insurancePolicyNumber: String(formData.get("insurancePolicyNumber") ?? "").trim() || undefined,
    insuranceExpiryDate: parseOrThrow(zOptionalDate("Insurance expiry date"), formData.get("insuranceExpiryDate") ?? ""),
    acquisitionDate: parseOrThrow(zOptionalDate("Acquisition date"), formData.get("acquisitionDate") ?? ""),
    acquisitionCost: parseOrThrow(zOptionalDecimal("Acquisition cost", { min: 0 }), formData.get("acquisitionCost") ?? ""),
    currentValue: parseOrThrow(zOptionalDecimal("Current value", { min: 0 }), formData.get("currentValue") ?? ""),
    currency: String(formData.get("currency") ?? "OMR").trim() || "OMR",
    ownershipPct:
      parseOrThrow(zOptionalDecimal("Ownership %", { min: 0, max: 100 }), formData.get("ownershipPct") ?? "100") ??
      "100",
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

  const vehicle = await db.$transaction(async (tx) => {
    const asset = await tx.asset.create({
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

    return tx.vehicle.create({
      data: {
        ...data,
        assetId: asset.id,
      },
    });
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

  const vehicle = await db.$transaction(async (tx) => {
    const updated = await tx.vehicle.update({
      where: { id },
      data,
    });

    if (existing.assetId) {
      await tx.asset.update({
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
    }

    return updated;
  });

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
    metadata: { documentType, count: files.length, fileNames: files.map((f) => f.name) },
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
    metadata: { vehicleId: document.vehicleId, fileName: document.fileName },
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
