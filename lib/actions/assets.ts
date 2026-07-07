"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit/log";
import { recordAssetValuation } from "@/lib/portfolio/valuations";
import { parseAssetCategorySelection } from "@/lib/assets/category-display";
import { refreshPreciousMetalPrices } from "@/lib/assets/refresh-precious-metal-prices";
import { createCustomAssetType, resolveCustomAssetType } from "@/lib/data/asset-types";
import { ensurePreciousMetalsSchema } from "@/lib/db/ensure-precious-metals-schema";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { getAssetLinkedModule, isModuleManagedAsset } from "@/lib/assets/linked-module";
import { assetEntityFilter } from "@/lib/permissions/scoped-queries";
import { assertStatusNotExited } from "@/lib/assets/status";
import type {
  AssetCategory,
  AssetStatus,
  PreciousMetalPriceBasis,
  PreciousMetalType,
  PreciousMetalUnit,
} from "@/lib/generated/prisma/client";

export type PreciousMetalInput = {
  metal: PreciousMetalType;
  unit: PreciousMetalUnit;
  quantity: string;
  priceBasis: PreciousMetalPriceBasis;
};

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
  preciousMetal?: PreciousMetalInput;
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

function categoryDetailCreate(
  category: AssetCategory,
  preciousMetal?: PreciousMetalInput,
) {
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
    case "PRECIOUS_METALS": {
      const detail = parsePreciousMetalInput(preciousMetal);
      return {
        preciousMetal: {
          create: {
            metal: detail.metal,
            unit: detail.unit,
            quantity: detail.quantity,
            priceBasis: detail.priceBasis,
          },
        },
      };
    }
    case "PUBLIC_EQUITY":
    case "OTHER":
    default:
      return { custom: { create: {} } };
  }
}

function parsePreciousMetalInput(input?: PreciousMetalInput) {
  if (!input) {
    throw new Error("Gold and silver assets require metal, unit, quantity, and price basis.");
  }

  const quantity = parseFloat(input.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Quantity must be greater than zero.");
  }

  return {
    metal: input.metal,
    unit: input.unit,
    quantity: quantity.toString(),
    priceBasis: input.priceBasis,
  };
}

async function upsertPreciousMetalDetail(assetId: string, input?: PreciousMetalInput) {
  const detail = parsePreciousMetalInput(input);
  await ensurePreciousMetalsSchema();

  await db.preciousMetalDetail.upsert({
    where: { assetId },
    create: {
      assetId,
      metal: detail.metal,
      unit: detail.unit,
      quantity: detail.quantity,
      priceBasis: detail.priceBasis,
    },
    update: {
      metal: detail.metal,
      unit: detail.unit,
      quantity: detail.quantity,
      priceBasis: detail.priceBasis,
    },
  });
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

  if (category === "PRECIOUS_METALS") {
    await ensurePreciousMetalsSchema();
  }

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
      currentValue:
        category === "PRECIOUS_METALS" ? undefined : parseDecimal(input.currentValue),
      description: input.description?.trim() || undefined,
      managerName: input.managerName?.trim() || undefined,
      managerEmail: input.managerEmail?.trim() || undefined,
      ...categoryDetailCreate(category, input.preciousMetal),
    },
    include: {
      assetType: { select: { name: true } },
      preciousMetal: true,
    },
  });

  if (category === "PRECIOUS_METALS") {
    await refreshPreciousMetalPrices(asset.id).catch(() => null);
  }

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
    where: {
      ...assetEntityFilter(ctx),
      ...statusFilter,
      peCompany: null,
    },
    include: {
      entity: true,
      assetType: { select: { name: true } },
      preciousMetal: true,
      exit: true,
      landParcel: { select: { id: true } },
      vehicle: { select: { id: true } },
      registeredCompany: { select: { id: true } },
      reProperty: { select: { id: true } },
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
      registeredCompany: { select: { id: true } },
      peCompany: { select: { id: true } },
      reProperty: { select: { id: true } },
    },
  });
  if (!asset) throw new Error("Asset not found.");
  if (isModuleManagedAsset(asset)) {
    const linked = getAssetLinkedModule(asset);
    throw new Error(
      linked
        ? `This asset is managed from ${linked.manageFrom}. Delete it there instead.`
        : "This asset is managed from another module.",
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

export async function getAsset(id: string) {
  const ctx = await requireModuleAccess("ASSETS");
  return db.asset.findFirst({
    where: { id, ...assetEntityFilter(ctx) },
    include: {
      entity: true,
      assetType: { select: { name: true } },
      preciousMetal: true,
      exit: { include: { documents: { orderBy: { createdAt: "desc" } } } },
      landParcel: { select: { id: true, sale: { select: { id: true } } } },
      vehicle: { select: { id: true } },
      registeredCompany: { select: { id: true } },
      peCompany: { select: { id: true } },
      reProperty: { select: { id: true } },
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
      registeredCompany: { select: { id: true } },
      peCompany: { select: { id: true } },
      reProperty: { select: { id: true } },
    },
  });
  if (!asset) throw new Error("Asset not found.");
  if (isModuleManagedAsset(asset)) {
    const linked = getAssetLinkedModule(asset);
    throw new Error(
      linked
        ? `This asset is linked to another record. Edit it from ${linked.manageFrom} instead.`
        : "This asset is managed from another module.",
    );
  }

  assertStatusNotExited(input.status);

  if (ctx.entityIds.length > 0 && !ctx.entityIds.includes(input.entityId)) {
    if (ctx.role !== "PRINCIPAL" && !ctx.isSuperAdmin) {
      throw new Error("You do not have access to this entity.");
    }
  }

  const isPreciousMetal = asset.category === "PRECIOUS_METALS";
  const manualCurrentValue = isPreciousMetal ? undefined : parseDecimal(input.currentValue);

  if (isPreciousMetal && input.preciousMetal) {
    await upsertPreciousMetalDetail(id, input.preciousMetal);
  }

  const updated = await db.asset.update({
    where: { id },
    data: {
      name: input.name.trim(),
      entityId: input.entityId,
      status: input.status,
      currency: input.currency || "OMR",
      acquisitionDate: parseDate(input.acquisitionDate),
      acquisitionCost: parseDecimal(input.acquisitionCost),
      ...(manualCurrentValue !== undefined
        ? {
            currentValue: manualCurrentValue,
            valueUpdatedAt: manualCurrentValue ? new Date() : asset.valueUpdatedAt,
          }
        : {}),
      description: input.description?.trim() || undefined,
      managerName: input.managerName?.trim() || undefined,
      managerEmail: input.managerEmail?.trim() || undefined,
    },
  });

  if (isPreciousMetal) {
    await refreshPreciousMetalPrices(id).catch(() => null);
  }

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "Asset",
    resourceId: id,
    metadata: { name: updated.name },
  });

  if (manualCurrentValue) {
    const value = parseFloat(manualCurrentValue);
    if (!Number.isNaN(value) && value > 0) {
      await recordAssetValuation({
        assetId: id,
        value,
        currency: updated.currency,
      });
    }
  }

  revalidatePath("/assets");
  revalidatePath("/assets/" + id);
  revalidatePath("/assets/" + id + "/edit");
  return updated;
}

export async function refreshPreciousMetalPricesAction(assetId?: string) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to refresh precious metal prices.");
  }

  const result = await refreshPreciousMetalPrices(assetId);

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "Asset",
    metadata: {
      job: "refresh-precious-metal-prices",
      assetId: assetId ?? null,
      ...result,
    },
  }).catch(() => null);

  revalidatePath("/assets");
  if (assetId) {
    revalidatePath("/assets/" + assetId);
    revalidatePath("/assets/" + assetId + "/edit");
  }
  revalidatePath("/dashboard");

  return result;
}
