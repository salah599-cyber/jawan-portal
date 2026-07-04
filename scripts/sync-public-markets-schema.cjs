/**
 * Idempotently applies public markets columns to an existing production database.
 * Uses pg directly so we never invoke Prisma Migrate (avoids P3005 on Vercel).
 *
 * Run manually:
 *   node scripts/sync-public-markets-schema.cjs
 */
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const { Client } = require("pg");

const PUBLIC_MARKETS_ENUM_EXPANSION_STATEMENTS = [
  `ALTER TYPE "PublicMarket" ADD VALUE IF NOT EXISTS 'UAE'`,
  `ALTER TYPE "PublicMarket" ADD VALUE IF NOT EXISTS 'SAUDI_ARABIA'`,
  `ALTER TYPE "PublicMarket" ADD VALUE IF NOT EXISTS 'KUWAIT'`,
  `ALTER TYPE "PublicMarket" ADD VALUE IF NOT EXISTS 'BAHRAIN'`,
  `ALTER TYPE "PublicMarket" ADD VALUE IF NOT EXISTS 'QATAR'`,
];

const PUBLIC_MARKETS_SCHEMA_STATEMENTS = [
  `CREATE TYPE "PublicMarket" AS ENUM ('MSX', 'UAE', 'SAUDI_ARABIA', 'KUWAIT', 'BAHRAIN', 'QATAR', 'USA', 'HONG_KONG', 'CHINA', 'INDIA', 'UK', 'OTHER')`,
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

const PUBLIC_MARKETS_SCHEMA_COLUMN_CHECK_SQL = `
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

function getDatabaseUrl() {
  return (
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL
  );
}

function isIgnorableSchemaError(message) {
  return (
    message.includes("already exists") ||
    message.includes("duplicate_object") ||
    message.includes("duplicate key") ||
    message.includes("IF NOT EXISTS")
  );
}

async function columnExists(client) {
  const result = await client.query(PUBLIC_MARKETS_SCHEMA_COLUMN_CHECK_SQL);
  return Boolean(result.rows[0]?.exists);
}

async function runStatements(client, statements) {
  for (const statement of statements) {
    try {
      await client.query(statement);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isIgnorableSchemaError(message)) continue;
      throw error;
    }
  }
}

async function main() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    console.log("No database URL set; skipping public markets schema sync.");
    return;
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await runStatements(client, PUBLIC_MARKETS_ENUM_EXPANSION_STATEMENTS);

    if (await columnExists(client)) {
      console.log("Public markets schema already present; enum values synced.");
      return;
    }

    await runStatements(client, PUBLIC_MARKETS_SCHEMA_STATEMENTS);

    if (!(await columnExists(client))) {
      throw new Error(
        "Public markets schema sync finished but PublicEquityHolding.priceFetchedAt is still missing.",
      );
    }

    console.log("Public markets schema applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Public markets schema sync failed:", error);
  process.exit(1);
});
