/**
 * Idempotently applies cash management schema (balance fields + history table).
 */
require("./load-env.cjs");

const { Client } = require("pg");

const statements = [
  `ALTER TYPE "ModuleName" ADD VALUE IF NOT EXISTS 'CASH_MANAGEMENT'`,
  `ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "currentBalance" DECIMAL(18,3)`,
  `ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "balanceAsOf" TIMESTAMP(3)`,
  `ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true`,
  `CREATE TABLE IF NOT EXISTS "BankBalanceEntry" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "balance" DECIMAL(18,3) NOT NULL,
    "balanceDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankBalanceEntry_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "BankBalanceEntry_bankAccountId_balanceDate_idx" ON "BankBalanceEntry"("bankAccountId", "balanceDate")`,
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

function isIgnorableSchemaError(message) {
  return (
    message.includes("already exists") ||
    message.includes("duplicate_object") ||
    message.includes("duplicate key") ||
    message.includes("IF NOT EXISTS")
  );
}

async function tableExists(client, tableName) {
  const result = await client.query(
    `SELECT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = $1
    )`,
    [tableName],
  );
  return Boolean(result.rows[0]?.exists);
}

async function main() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    console.log("No database URL configured; skipping cash management schema sync.");
    return;
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    for (const statement of statements) {
      try {
        await client.query(statement);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isIgnorableSchemaError(message)) continue;
        throw error;
      }
    }

    if (!(await tableExists(client, "BankBalanceEntry"))) {
      throw new Error("Cash management schema sync finished but BankBalanceEntry table is still missing.");
    }

    console.log("Cash management schema synced successfully.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
