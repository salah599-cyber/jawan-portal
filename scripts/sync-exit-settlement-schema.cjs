#!/usr/bin/env node
/**
 * Idempotently adds exit proceeds settlement columns and suspense account flag.
 *
 * Usage:
 *   node scripts/sync-exit-settlement-schema.cjs
 */
require("./load-env.cjs");

const { Client } = require("pg");

const EXIT_SETTLEMENT_SCHEMA_STATEMENTS = [
  `CREATE TYPE "ExitProceedSettlementStatus" AS ENUM ('PENDING', 'SETTLED', 'NONE')`,
  `ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "isExitSuspense" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "AssetExit" ADD COLUMN IF NOT EXISTS "settlementStatus" "ExitProceedSettlementStatus" NOT NULL DEFAULT 'NONE'`,
  `ALTER TABLE "AssetExit" ADD COLUMN IF NOT EXISTS "suspenseBankAccountId" TEXT`,
  `ALTER TABLE "AssetExit" ADD COLUMN IF NOT EXISTS "settledBankAccountId" TEXT`,
  `ALTER TABLE "AssetExit" ADD COLUMN IF NOT EXISTS "settledAt" TIMESTAMP(3)`,
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
        AND a.attname = 'settlementStatus'
        AND a.attnum > 0
        AND NOT a.attisdropped
    ) AS "exists"
  `);
  return Boolean(result.rows[0]?.exists);
}

async function main() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    console.log("No database URL set; skipping exit settlement schema sync.");
    return;
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    for (const statement of EXIT_SETTLEMENT_SCHEMA_STATEMENTS) {
      try {
        await client.query(statement);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!isIgnorable(message)) throw error;
      }
    }

    if (!(await columnExists(client))) {
      throw new Error("Exit settlement schema sync finished but AssetExit.settlementStatus is still missing.");
    }

    console.log("Exit settlement schema applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Exit settlement schema sync failed:", error);
  process.exit(1);
});
