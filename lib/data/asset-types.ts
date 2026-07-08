import { db } from "@/lib/db";
import { ensureAssetTypesSchema } from "@/lib/db/ensure-asset-types-schema";
import { ASSET_CATEGORY_LABELS } from "@/lib/labels";

const RESERVED_TYPE_NAMES = new Set(
  Object.values(ASSET_CATEGORY_LABELS).map((label) => label.trim().toLowerCase()),
);

export async function listCustomAssetTypes() {
  await ensureAssetTypesSchema();
  return db.assetType.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
}

export async function createCustomAssetType(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Asset type name is required.");
  if (RESERVED_TYPE_NAMES.has(trimmed.toLowerCase())) {
    throw new Error("This name matches a built-in asset category.");
  }

  await ensureAssetTypesSchema();

  const existing = await db.assetType.findUnique({ where: { name: trimmed } });
  if (existing) {
    if (!existing.isActive) {
      return db.assetType.update({
        where: { id: existing.id },
        data: { isActive: true },
        select: { id: true, name: true },
      });
    }
    return { id: existing.id, name: existing.name };
  }

  const maxOrder = await db.assetType.aggregate({ _max: { sortOrder: true } });
  return db.assetType.create({
    data: {
      name: trimmed,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
    select: { id: true, name: true },
  });
}

export async function resolveCustomAssetType(typeId: string) {
  await ensureAssetTypesSchema();

  const type = await db.assetType.findFirst({
    where: { id: typeId, isActive: true },
    select: { id: true, name: true },
  });
  if (!type) throw new Error("Asset type not found.");
  return type;
}
