import { db } from "@/lib/db";
import { ensurePreciousMetalsSchema } from "@/lib/db/ensure-precious-metals-schema";
import type { Prisma } from "@/lib/generated/prisma/client";

const assetListInclude = {
  entity: true,
  assetType: { select: { name: true } },
  exit: true,
  landParcel: { select: { id: true } },
  vehicle: { select: { id: true } },
  registeredCompany: { select: { id: true } },
  reProperty: { select: { id: true } },
} satisfies Prisma.AssetInclude;

const assetListIncludeWithPreciousMetal = {
  ...assetListInclude,
  preciousMetal: true,
} satisfies Prisma.AssetInclude;

const assetDetailInclude = {
  entity: true,
  assetType: { select: { name: true } },
  preciousMetal: true,
  exit: { include: { documents: { orderBy: { createdAt: "desc" as const } } } },
  landParcel: { select: { id: true, sale: { select: { id: true } } } },
  vehicle: { select: { id: true } },
  registeredCompany: { select: { id: true } },
  peCompany: { select: { id: true } },
  reProperty: { select: { id: true } },
} satisfies Prisma.AssetInclude;

const assetDetailIncludeFallback = {
  entity: true,
  assetType: { select: { name: true } },
  exit: { include: { documents: { orderBy: { createdAt: "desc" as const } } } },
  landParcel: { select: { id: true, sale: { select: { id: true } } } },
  vehicle: { select: { id: true } },
  registeredCompany: { select: { id: true } },
  peCompany: { select: { id: true } },
  reProperty: { select: { id: true } },
} satisfies Prisma.AssetInclude;

export type AssetListRow = Prisma.AssetGetPayload<{
  include: typeof assetListIncludeWithPreciousMetal;
}>;

export type AssetDetailRow = Prisma.AssetGetPayload<{
  include: typeof assetDetailInclude;
}>;

export async function listAssetsWithRelations(
  where: Prisma.AssetWhereInput,
  orderBy: Prisma.AssetOrderByWithRelationInput = { updatedAt: "desc" },
): Promise<AssetListRow[]> {
  await ensurePreciousMetalsSchema().catch(() => null);

  try {
    return await db.asset.findMany({
      where,
      include: assetListIncludeWithPreciousMetal,
      orderBy,
    });
  } catch (error) {
    console.error("listAssetsWithRelations preciousMetal include failed:", error);
    const rows = await db.asset.findMany({
      where,
      include: assetListInclude,
      orderBy,
    });
    return rows.map((row) => ({ ...row, preciousMetal: null }));
  }
}

export async function getAssetWithRelations(
  where: Prisma.AssetWhereInput,
): Promise<AssetDetailRow | null> {
  await ensurePreciousMetalsSchema().catch(() => null);

  try {
    return await db.asset.findFirst({
      where,
      include: assetDetailInclude,
    });
  } catch (error) {
    console.error("getAssetWithRelations preciousMetal include failed:", error);
    const row = await db.asset.findFirst({
      where,
      include: assetDetailIncludeFallback,
    });
    return row ? { ...row, preciousMetal: null } : null;
  }
}
