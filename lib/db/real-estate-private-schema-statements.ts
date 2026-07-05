export const PRIVATE_RE_SCHEMA_COLUMN_CHECK_SQL = `
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ReProperty'
      AND column_name = 'portfolioTrack'
  ) AS exists
`;

export function isIgnorablePrivateReSchemaError(message: string) {
  return (
    message.includes("already exists") ||
    message.includes("duplicate_object") ||
    message.includes("duplicate key") ||
    message.includes("IF NOT EXISTS")
  );
}

export const PRIVATE_RE_ENUM_STATEMENTS = [
  `CREATE TYPE "RePortfolioTrack" AS ENUM ('INVESTMENT', 'PRIVATE')`,
  `CREATE TYPE "ReFinishingQuality" AS ENUM ('STANDARD', 'HIGH_END', 'LUXURY')`,
  `CREATE TYPE "RePropertyCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'NEEDS_RENOVATION')`,
  `CREATE TYPE "RePrivateCostCategory" AS ENUM ('ELECTRICITY', 'WATER', 'MUNICIPALITY_FEES', 'INTERNET_TELECOM', 'SECURITY', 'HOUSEKEEPING', 'GARDENING', 'POOL_MAINTENANCE', 'PEST_CONTROL', 'AC_MAINTENANCE', 'GENERAL_MAINTENANCE_RESERVE')`,
  `CREATE TYPE "RePrivateStaffRole" AS ENUM ('DRIVER', 'HOUSEKEEPER', 'COOK', 'SECURITY_GUARD', 'GARDENER', 'OTHER')`,
  `CREATE TYPE "RePrivateStaffArrangement" AS ENUM ('LIVE_IN', 'LIVE_OUT')`,
];

export const PRIVATE_RE_DOCUMENT_ENUM_STATEMENTS = [
  `ALTER TYPE "RePropertyDocumentType" ADD VALUE IF NOT EXISTS 'COMPLETION_CERTIFICATE'`,
  `ALTER TYPE "RePropertyDocumentType" ADD VALUE IF NOT EXISTS 'ARCHITECTURAL_DRAWING'`,
  `ALTER TYPE "RePropertyDocumentType" ADD VALUE IF NOT EXISTS 'RENOVATION_CONTRACT'`,
  `ALTER TYPE "RePropertyDocumentType" ADD VALUE IF NOT EXISTS 'UTILITY_ACCOUNT'`,
  `ALTER TYPE "RePropertyDocumentType" ADD VALUE IF NOT EXISTS 'STAFF_CONTRACT'`,
];

export const PRIVATE_RE_SCHEMA_STATEMENTS = [
  `ALTER TABLE "ReProperty" ADD COLUMN IF NOT EXISTS "portfolioTrack" "RePortfolioTrack" NOT NULL DEFAULT 'INVESTMENT'`,
  `ALTER TABLE "ReProperty" ADD COLUMN IF NOT EXISTS "liabilityId" TEXT`,
  `CREATE INDEX IF NOT EXISTS "ReProperty_entityId_portfolioTrack_idx" ON "ReProperty"("entityId", "portfolioTrack")`,
  `CREATE TABLE IF NOT EXISTS "RePrivatePropertyDetail" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "titleDeedNumber" TEXT,
    "registeredOwner" TEXT,
    "beneficialOwner" TEXT,
    "numBedrooms" INTEGER,
    "numBathrooms" INTEGER,
    "numParkingSpaces" INTEGER,
    "constructionType" TEXT,
    "finishingQuality" "ReFinishingQuality",
    "furnishingStatus" "ReFurnishingStatus",
    "hasPool" BOOLEAN NOT NULL DEFAULT false,
    "hasGardenLandscaping" BOOLEAN NOT NULL DEFAULT false,
    "hasSmartHome" BOOLEAN NOT NULL DEFAULT false,
    "condition" "RePropertyCondition",
    "lastRenovationDate" TIMESTAMP(3),
    "lastRenovationCostOmr" DECIMAL(18,3),
    "wasiyyaConditions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RePrivatePropertyDetail_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "RePrivatePropertyDetail_propertyId_key" ON "RePrivatePropertyDetail"("propertyId")`,
  `CREATE TABLE IF NOT EXISTS "RePrivateRunningCost" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "category" "RePrivateCostCategory" NOT NULL,
    "provider" TEXT,
    "meterNumber" TEXT,
    "accountNumber" TEXT,
    "frequency" "ReRecurrenceFrequency",
    "monthlyCostOmr" DECIMAL(18,3),
    "annualCostOmr" DECIMAL(18,3),
    "paymentStatus" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RePrivateRunningCost_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "RePrivateRunningCost_propertyId_category_key" ON "RePrivateRunningCost"("propertyId", "category")`,
  `CREATE INDEX IF NOT EXISTS "RePrivateRunningCost_propertyId_idx" ON "RePrivateRunningCost"("propertyId")`,
  `CREATE TABLE IF NOT EXISTS "RePrivateStaff" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "nationality" TEXT,
    "idNumber" TEXT,
    "role" "RePrivateStaffRole" NOT NULL DEFAULT 'OTHER',
    "arrangement" "RePrivateStaffArrangement",
    "contractExpiry" TIMESTAMP(3),
    "visaExpiry" TIMESTAMP(3),
    "monthlySalaryOmr" DECIMAL(18,3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RePrivateStaff_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "RePrivateStaff_propertyId_idx" ON "RePrivateStaff"("propertyId")`,
  `CREATE INDEX IF NOT EXISTS "RePrivateStaff_visaExpiry_idx" ON "RePrivateStaff"("visaExpiry")`,
  `CREATE INDEX IF NOT EXISTS "RePrivateStaff_contractExpiry_idx" ON "RePrivateStaff"("contractExpiry")`,
  `ALTER TABLE "ReProperty" ADD CONSTRAINT "ReProperty_liabilityId_fkey" FOREIGN KEY ("liabilityId") REFERENCES "Liability"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
  `ALTER TABLE "RePrivatePropertyDetail" ADD CONSTRAINT "RePrivatePropertyDetail_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ReProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "RePrivateRunningCost" ADD CONSTRAINT "RePrivateRunningCost_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ReProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "RePrivateStaff" ADD CONSTRAINT "RePrivateStaff_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ReProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
];
