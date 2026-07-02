"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit/log";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { createAssetCategory } from "@/lib/data/asset-categories";
import type { AssetCategory } from "@/lib/generated/prisma/client";

export async function addAssetCategory(name: string, categoryKind: AssetCategory) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to add asset categories.");
  }

  const category = await createAssetCategory(name, categoryKind);

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "AssetCategoryRecord",
    resourceId: category.id,
    metadata: { name: category.name, categoryKind: category.categoryKind },
  });

  revalidatePath("/assets");
  revalidatePath("/assets/new");

  return {
    id: category.id,
    name: category.name,
    categoryKind: category.categoryKind,
    isSystem: category.isSystem,
  };
}
