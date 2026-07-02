"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit/log";
import { parseAssetCategorySelection } from "@/lib/assets/category-display";
import { createCustomAssetType, resolveCustomAssetType } from "@/lib/data/asset-types";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { assetEntityFilter } from "@/lib/permissions/scoped-queries";
import { assertStatusNotExited } from "@/lib/assets/status";
import type { AssetCategory, AssetStatus } from "@/lib/generated/prisma/client";

export type CreateAssetInput = {
  name: string;
  category?: AssetCategory;
  categorySelection?: string;
  assetTypeId?: string;
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

async function resolveAssetCategoryInput(input: Pick<CreateAssetInput, "category" | "categorySelection" | "assetTypeId">) {
  if (input.categorySelection) {
    const parsed = parseAssetCategorySelection(input.categorySelection);
    if (parsed.kind === "custom") {
      const type = await resolveCustomAssetType(parsed.assetTypeId);
      return { category: "OTHER" as AssetCategory, assetTypeId: type.id };
    }
    return { category: parsed.category as AssetCategory, assetTypeId: undefined };
  }

  if (input.assetTypeId) {
    const type = await resolveCustomAssetType(input.assetTypeId);
    return { category: "OTHER" as AssetCategory, assetTypeId: type.id };
  }

  if (input.category) {
    return { category: input.category, assetTypeId: undefined };
  }

  throw new Error("Category is required.");
}

export async function addCustomAssetType(name: string) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to add asset types.");
  }

  const type = await createCustomAssetType(name);

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "AssetType",
    resourceId: type.id,
    metadata: { name: type.name },
  });

  revalidatePath("/assets");
  revalidatePath("/assets/new");
  return type;
}

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

  const { category, assetTypeId } = await resolveAssetCategoryInput(input);

  const asset = await db.asset.create({
    data: {
      name: input.name.trim(),
      category,
      assetTypeId,
      entityId: input.entityId,
      status: input.status,
      currency: input.currency || "OMR",
      acquisitionDate: parseDate(input.acquisitionDate),
      acquisitionCost: parseDecimal(input.acquisitionCost),
      currentValue: parseDecimal(input.currentValue),
      description: input.description?.trim() || undefined,
      managerName: input.managerName?.trim() || undefined,
      managerEmail: input.managerEmail?.trim() || undefined,
      ...categoryDetailCreate(category),
    },
    include: { assetType: { select: { name: true } } },
  });

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "Asset",
    resourceId: asset.id,
    metadata: {
      name: asset.name,
      category: asset.category,
      assetType: asset.assetType?.name,
    },
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
      assetType: { select: { name: true } },
      exit: true,
      landParcel: { select: { id: true } },
      vehicle: { select: { id: true } },
      registeredCompany: { select: { id: true } },
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
      assetType: { select: { name: true } },
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

  const currentValue = parseDecimal(input.currentValue);
  const updated = await db.asset.update({
    where: { id },
    data: {
      name: input.name.trim(),
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
    metadata: { name: updated.name },
  });

  revalidatePath("/assets");
  revalidatePath("/assets/" + id + "/edit");
  return updated;
}
