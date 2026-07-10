#!/usr/bin/env node
/**
 * Idempotently adds the columns that back auto ROI calculation and unified
 * exit analytics (AssetExit.realizedGainPct, PeExit invested/ROI snapshots,
 * ReProperty sale details).
 *
 * Usage:
 *   node scripts/sync-exit-roi-schema.cjs
 */
require("./load-env.cjs");

const { Client } = require("pg");

const EXIT_ROI_SCHEMA_STATEMENTS = [
  `ALTER TABLE "AssetExit" ADD COLUMN IF NOT EXISTS "realizedGainPct" DECIMAL(8,4)`,
  `ALTER TABLE IF EXISTS "PeExit" ADD COLUMN IF NOT EXISTS "totalInvestedSnapshot" DECIMAL(18,2)`,
  `ALTER TABLE IF EXISTS "PeExit" ADD COLUMN IF NOT EXISTS "realizedGainPct" DECIMAL(8,4)`,
  `ALTER TABLE IF EXISTS "ReProperty" ADD COLUMN IF NOT EXISTS "soldDate" TIMESTAMP(3)`,
  `ALTER TABLE IF EXISTS "ReProperty" ADD COLUMN IF NOT EXISTS "soldPriceOmr" DECIMAL(18,3)`,
  `ALTER TABLE IF EXISTS "ReProperty" ADD COLUMN IF NOT EXISTS "soldTo" TEXT`,
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
    message.includes("duplicate key")
  );
}

async function columnExists(client) {
  const result = await client.query(`
    SELECT EXISTS (
      SELECT 1
      FROM pg_attribute a
      JOIN pg_class c ON a.attrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public'
        AND c.relname = 'AssetExit'
        AND a.attname = 'realizedGainPct'
        AND a.attnum > 0
        AND NOT a.attisdropped
    ) AS "exists"
  `);
  return Boolean(result.rows[0]?.exists);
}

async function main() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    console.log("No database URL set; skipping exit ROI schema sync.");
    return;
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    for (const statement of EXIT_ROI_SCHEMA_STATEMENTS) {
      try {
        await client.query(statement);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!isIgnorable(message)) throw error;
      }
    }

    if (!(await columnExists(client))) {
      throw new Error("Exit ROI schema sync finished but AssetExit.realizedGainPct is still missing.");
    }

    console.log("Exit ROI schema applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Exit ROI schema sync failed:", error);
  process.exit(1);
});
