import { db } from "@/lib/db";
import { ensureAssetSchema } from "@/lib/db/ensure-asset-schema";
import { ASSET_CATEGORY_LABELS } from "@/lib/labels";
import type { AssetCategory } from "@/lib/generated/prisma/client";

export type AssetCategoryOption = {
  id: string;
  name: string;
  categoryKind: AssetCategory;
  isSystem: boolean;
};

const DEFAULT_ASSET_CATEGORIES = Object.entries(ASSET_CATEGORY_LABELS).map(
  ([categoryKind, name], index) => ({
    name,
    categoryKind: categoryKind as AssetCategory,
    sortOrder: index,
    isSystem: true,
  }),
);

async function findCategoryByName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  return db.assetCategoryRecord.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
  });
}

export async function ensureDefaultAssetCategories() {
  await ensureAssetSchema();
  const count = await db.assetCategoryRecord.count();
  if (count === 0) {
    await db.assetCategoryRecord.createMany({
      data: DEFAULT_ASSET_CATEGORIES,
      skipDuplicates: true,
    });
  }

  await backfillAssetCategoryIds();
}

async function backfillAssetCategoryIds() {
  const assets = await db.asset.findMany({
    where: { categoryId: null },
    select: { id: true, category: true },
  });

  if (assets.length === 0) return;

  const systemCategories = await db.assetCategoryRecord.findMany({
    where: { isSystem: true },
    select: { id: true, categoryKind: true },
  });
  const byKind = new Map(systemCategories.map((c) => [c.categoryKind, c.id]));

  for (const asset of assets) {
    const categoryId = byKind.get(asset.category);
    if (!categoryId) continue;
    await db.asset.update({
      where: { id: asset.id },
      data: { categoryId },
    });
  }
}

export async function listAssetCategories(): Promise<AssetCategoryOption[]> {
  await ensureDefaultAssetCategories();
  return db.assetCategoryRecord.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, categoryKind: true, isSystem: true },
  });
}

export async function resolveAssetCategoryId(value: string) {
  await ensureDefaultAssetCategories();
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Category is required.");

  const byId = await db.assetCategoryRecord.findFirst({
    where: { id: trimmed, isActive: true },
  });
  if (byId) return byId;

  const byKind = await db.assetCategoryRecord.findFirst({
    where: { categoryKind: trimmed as AssetCategory, isSystem: true, isActive: true },
  });
  if (byKind) return byKind;

  const byName = await findCategoryByName(trimmed);
  if (byName) {
    if (!byName.isActive) {
      return db.assetCategoryRecord.update({
        where: { id: byName.id },
        data: { isActive: true },
      });
    }
    return byName;
  }

  throw new Error("Asset category not found.");
}

export async function createAssetCategory(name: string, categoryKind: AssetCategory) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name is required.");

  await ensureDefaultAssetCategories();

  const existing = await findCategoryByName(trimmed);
  if (existing) {
    if (!existing.isActive) {
      return db.assetCategoryRecord.update({
        where: { id: existing.id },
        data: { isActive: true, categoryKind },
      });
    }
    return existing;
  }

  const maxOrder = await db.assetCategoryRecord.aggregate({ _max: { sortOrder: true } });
  return db.assetCategoryRecord.create({
    data: {
      name: trimmed,
      categoryKind,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });
}

export function getAssetCategoryDisplayName(asset: {
  category: string;
  categoryRecord?: { name: string } | null;
}) {
  return asset.categoryRecord?.name ?? ASSET_CATEGORY_LABELS[asset.category] ?? asset.category;
}
