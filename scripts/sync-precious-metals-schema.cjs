#!/usr/bin/env node
/**
 * Idempotently ensures precious metals tables and enums exist.
 */
require("./load-env.cjs");

const { Client } = require("pg");

const PRECIOUS_METALS_SCHEMA_STATEMENTS = [
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

function getDatabaseUrl() {
  return (
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL
  );
}

function isIgnorable(message) {
  return (
    message.includes("already exists") ||
    message.includes("duplicate_object") ||
    message.includes("duplicate key") ||
    message.includes("IF NOT EXISTS")
  );
}

async function tableExists(client) {
  const result = await client.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'PreciousMetalDetail'
    ) AS "exists"
  `);
  return Boolean(result.rows[0]?.exists);
}

async function main() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    console.log("No database URL set; skipping precious metals schema sync.");
    return;
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    if (await tableExists(client)) {
      console.log("Precious metals schema already present; nothing to do.");
      return;
    }

    for (const statement of PRECIOUS_METALS_SCHEMA_STATEMENTS) {
      try {
        await client.query(statement);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isIgnorable(message)) continue;
        throw error;
      }
    }

    if (!(await tableExists(client))) {
      throw new Error("Precious metals schema sync finished but PreciousMetalDetail table is still missing.");
    }

    console.log("Precious metals schema applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Precious metals schema sync failed:", error);
  process.exit(1);
});
