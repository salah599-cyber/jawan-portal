CREATE TYPE "AssetDocumentType" AS ENUM ('PHOTO', 'WARRANTY', 'INVOICE', 'RECEIPT', 'MANUAL', 'OTHER');

CREATE TABLE "AssetCategoryRecord" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryKind" "AssetCategory" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetCategoryRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssetCategoryRecord_name_key" ON "AssetCategoryRecord"("name");

ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

CREATE TABLE "AssetDocument" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "documentType" "AssetDocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssetDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AssetDocument_assetId_documentType_idx" ON "AssetDocument"("assetId", "documentType");

ALTER TABLE "Asset" ADD CONSTRAINT "Asset_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AssetCategoryRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AssetDocument" ADD CONSTRAINT "AssetDocument_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
