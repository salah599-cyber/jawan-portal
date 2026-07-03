/**
 * Ordered DDL statements for public markets schema extensions.
 * Kept as a plain list so runtime (Prisma) and build-time (pg) sync never
 * break DO $$ blocks when splitting on semicolons.
 */
export const PUBLIC_MARKETS_SCHEMA_STATEMENTS = [
  `CREATE TYPE "PublicMarket" AS ENUM ('MSX', 'USA', 'HONG_KONG', 'CHINA', 'INDIA', 'UK', 'OTHER')`,
  `CREATE TYPE "PublicHoldingSource" AS ENUM ('IMPORT', 'MANUAL')`,
  `ALTER TABLE "PublicEquityHolding" ADD COLUMN IF NOT EXISTS "market" "PublicMarket" NOT NULL DEFAULT 'MSX'`,
  `ALTER TABLE "PublicEquityHolding" ADD COLUMN IF NOT EXISTS "exchange" TEXT`,
  `ALTER TABLE "PublicEquityHolding" ADD COLUMN IF NOT EXISTS "isin" TEXT`,
  `ALTER TABLE "PublicEquityHolding" ADD COLUMN IF NOT EXISTS "cusip" TEXT`,
  `ALTER TABLE "PublicEquityHolding" ADD COLUMN IF NOT EXISTS "sedol" TEXT`,
  `ALTER TABLE "PublicEquityHolding" ADD COLUMN IF NOT EXISTS "country" TEXT`,
  `ALTER TABLE "PublicEquityHolding" ADD COLUMN IF NOT EXISTS "source" "PublicHoldingSource" NOT NULL DEFAULT 'IMPORT'`,
  `ALTER TABLE "ImportBatch" ADD COLUMN IF NOT EXISTS "market" "PublicMarket"`,
  `ALTER TABLE "ImportBatch" ADD COLUMN IF NOT EXISTS "broker" TEXT`,
  `ALTER TABLE "ImportBatch" ADD COLUMN IF NOT EXISTS "accountNumber" TEXT`,
  `ALTER TABLE "ImportBatch" ADD COLUMN IF NOT EXISTS "asOfDate" TIMESTAMP(3)`,
  `ALTER TABLE "ImportBatch" ADD COLUMN IF NOT EXISTS "parserId" TEXT`,
  `UPDATE "PublicEquityHolding" SET "market" = 'MSX' WHERE "market" IS NULL`,
  `UPDATE "PublicEquityHolding" SET "source" = 'IMPORT' WHERE "source" IS NULL`,
  `CREATE INDEX IF NOT EXISTS "PublicEquityHolding_assetId_market_idx" ON "PublicEquityHolding" ("assetId", "market")`,
  `CREATE INDEX IF NOT EXISTS "PublicEquityHolding_market_idx" ON "PublicEquityHolding" ("market")`,
  `ALTER TABLE "PublicEquityHolding" ADD COLUMN IF NOT EXISTS "priceFetchedAt" TIMESTAMP(3)`,
  `ALTER TABLE "PublicEquityHolding" ADD COLUMN IF NOT EXISTS "priceSource" TEXT`,
];

export function isIgnorablePublicMarketsSchemaError(message: string) {
  return (
    message.includes("already exists") ||
    message.includes("duplicate_object") ||
    message.includes("duplicate key") ||
    message.includes("IF NOT EXISTS")
  );
}

export const PUBLIC_MARKETS_SCHEMA_COLUMN_CHECK_SQL = `
  SELECT EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'PublicEquityHolding'
      AND a.attname = 'priceFetchedAt'
      AND a.attnum > 0
      AND NOT a.attisdropped
  ) AS "exists"
`;
