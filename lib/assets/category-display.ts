import { ASSET_CATEGORY_LABELS } from "@/lib/labels";

type AssetCategorySource = {
  category: string;
  assetType?: { name: string } | null;
  preciousMetal?: { metal: string } | null;
};

export function getAssetCategoryLabel(asset: AssetCategorySource): string {
  if (asset.preciousMetal?.metal === "GOLD") return "Gold";
  if (asset.preciousMetal?.metal === "SILVER") return "Silver";
  if (asset.assetType?.name) return asset.assetType.name;
  return ASSET_CATEGORY_LABELS[asset.category] ?? asset.category;
}

export function getAssetCategoryKey(asset: AssetCategorySource): string {
  if (asset.assetType?.name) return `custom:${asset.assetType.name}`;
  return asset.category;
}

export const BUILT_IN_ASSET_CATEGORY_VALUE_PREFIX = "category:";
export const CUSTOM_ASSET_TYPE_VALUE_PREFIX = "type:";

export function encodeBuiltInAssetCategory(category: string) {
  return `${BUILT_IN_ASSET_CATEGORY_VALUE_PREFIX}${category}`;
}

export function encodeCustomAssetType(typeId: string) {
  return `${CUSTOM_ASSET_TYPE_VALUE_PREFIX}${typeId}`;
}

export function parseAssetCategorySelection(value: string) {
  if (value.startsWith(CUSTOM_ASSET_TYPE_VALUE_PREFIX)) {
    return {
      kind: "custom" as const,
      assetTypeId: value.slice(CUSTOM_ASSET_TYPE_VALUE_PREFIX.length),
    };
  }

  if (value.startsWith(BUILT_IN_ASSET_CATEGORY_VALUE_PREFIX)) {
    return {
      kind: "built-in" as const,
      category: value.slice(BUILT_IN_ASSET_CATEGORY_VALUE_PREFIX.length),
    };
  }

  return {
    kind: "built-in" as const,
    category: value,
  };
}
