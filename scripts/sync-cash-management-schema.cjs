/**
 * Idempotently applies cash management schema (balance fields + history table).
 */
require("./load-env.cjs");

const { Client } = require("pg");

const BASE_SCHEMA_STATEMENTS = [
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
  `ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "includeInCashPosition" BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "includeInTransferLetterSource" BOOLEAN NOT NULL DEFAULT true`,
];

const PER_ACCOUNT_BALANCE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "BankAccountNumber" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'OMR',
    "label" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankAccountNumber_pkey" PRIMARY KEY ("id")
  )`,
  `ALTER TABLE "BankAccountNumber" ADD COLUMN IF NOT EXISTS "currentBalance" DECIMAL(18,3)`,
  `ALTER TABLE "BankAccountNumber" ADD COLUMN IF NOT EXISTS "balanceAsOf" TIMESTAMP(3)`,
  `ALTER TABLE "BankBalanceEntry" ADD COLUMN IF NOT EXISTS "bankAccountNumberId" TEXT`,
  `CREATE INDEX IF NOT EXISTS "BankBalanceEntry_bankAccountNumberId_balanceDate_idx" ON "BankBalanceEntry"("bankAccountNumberId", "balanceDate")`,
  `DO $$ BEGIN
    ALTER TABLE "BankBalanceEntry" ADD CONSTRAINT "BankBalanceEntry_bankAccountNumberId_fkey"
      FOREIGN KEY ("bankAccountNumberId") REFERENCES "BankAccountNumber"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `UPDATE "BankAccountNumber" n
    SET "currentBalance" = b."currentBalance",
        "balanceAsOf" = b."balanceAsOf"
    FROM "BankAccount" b
    WHERE n."bankAccountId" = b.id
      AND n."sortOrder" = 0
      AND b."currentBalance" IS NOT NULL
      AND n."currentBalance" IS NULL`,
  `UPDATE "BankBalanceEntry" e
    SET "bankAccountNumberId" = n.id
    FROM "BankAccountNumber" n
    WHERE e."bankAccountId" = n."bankAccountId"
      AND n."sortOrder" = 0
      AND e."bankAccountNumberId" IS NULL`,
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

async function columnExists(client, tableName, columnName) {
  const result = await client.query(
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND lower(table_name) = lower($1)
        AND lower(column_name) = lower($2)
    )`,
    [tableName, columnName],
  );
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
    console.log("No database URL configured; skipping cash management schema sync.");
    return;
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await runStatements(client, BASE_SCHEMA_STATEMENTS);
    await runStatements(client, PER_ACCOUNT_BALANCE_STATEMENTS);

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
