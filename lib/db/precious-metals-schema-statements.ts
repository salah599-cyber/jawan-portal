export const PRECIOUS_METALS_TABLE_CHECK_SQL = `
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'PreciousMetalDetail'
  ) AS "exists"
`;

export const PRECIOUS_METALS_SCHEMA_STATEMENTS = [
  `ALTER TYPE "AssetCategory" ADD VALUE IF NOT EXISTS 'PRECIOUS_METALS'`,
  `CREATE TYPE "PreciousMetalType" AS ENUM ('GOLD', 'SILVER')`,
  `CREATE TYPE "PreciousMetalUnit" AS ENUM ('GRAM', 'TOLA_10', 'KG', 'OZ')`,
  `CREATE TYPE "PreciousMetalPriceBasis" AS ENUM ('OMR_BUY', 'OMR_SELL', 'USD_SPOT_OZ')`,
  `CREATE TABLE IF NOT EXISTS "PreciousMetalDetail" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "metal" "PreciousMetalType" NOT NULL,
    "unit" "PreciousMetalUnit" NOT NULL,
    "quantity" DECIMAL(18,6) NOT NULL,
    "priceBasis" "PreciousMetalPriceBasis" NOT NULL DEFAULT 'OMR_BUY',
    "lastUnitPrice" DECIMAL(18,6),
    "priceFetchedAt" TIMESTAMP(3),
    "priceSource" TEXT,
    CONSTRAINT "PreciousMetalDetail_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PreciousMetalDetail_assetId_key" ON "PreciousMetalDetail"("assetId")`,
];

export function isIgnorablePreciousMetalsSchemaError(message: string) {
  return (
    message.includes("already exists") ||
    message.includes("duplicate_object") ||
    message.includes("duplicate key") ||
    message.includes("IF NOT EXISTS")
  );
}
