"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit/log";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { assetEntityFilter } from "@/lib/permissions/scoped-queries";
import type { AssetCategory, AssetStatus } from "@/lib/generated/prisma/client";

export type CreateAssetInput = {
  name: string;
  category: AssetCategory;
  entityId: string;
  status: AssetStatus;
  currency: string;
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

  const asset = await db.asset.create({
    data: {
      name: input.name.trim(),
      category: input.category,
      entityId: input.entityId,
      status: input.status,
      currency: input.currency || "OMR",
      acquisitionCost: parseDecimal(input.acquisitionCost),
      currentValue: parseDecimal(input.currentValue),
      description: input.description?.trim() || undefined,
      managerName: input.managerName?.trim() || undefined,
      managerEmail: input.managerEmail?.trim() || undefined,
      ...categoryDetailCreate(input.category),
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "Asset",
    resourceId: asset.id,
    metadata: { name: asset.name, category: asset.category },
  });

  revalidatePath("/assets");
  return asset;
}

export async function listAssets() {
  const ctx = await requireModuleAccess("ASSETS");
  return db.asset.findMany({
    where: assetEntityFilter(ctx),
    include: {
      entity: true,
      landParcel: { select: { id: true } },
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
    include: { landParcel: { select: { id: true } } },
  });
  if (!asset) throw new Error("Asset not found.");
  if (asset.landParcel) {
    throw new Error(
      "This asset is linked to a land parcel. Delete it from the Lands section instead.",
    );
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
