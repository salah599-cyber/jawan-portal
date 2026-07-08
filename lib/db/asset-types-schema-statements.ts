export const ASSET_TYPES_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "AssetType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssetType_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "AssetType_name_key" ON "AssetType"("name")`,
  `ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "assetTypeId" TEXT`,
  `CREATE INDEX IF NOT EXISTS "Asset_assetTypeId_idx" ON "Asset"("assetTypeId")`,
];
