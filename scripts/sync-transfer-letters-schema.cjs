/**
 * Idempotently applies TransferLetter tables to an existing production database.
 */
require("./load-env.cjs");

const { Client } = require("pg");

const TRANSFER_LETTERS_SCHEMA_STATEMENTS = [
  `CREATE TYPE "TransferLetterType" AS ENUM ('LOCAL', 'INTERNATIONAL', 'UK')`,
  `CREATE TABLE IF NOT EXISTS "TransferLetter" (
    "id" TEXT NOT NULL,
    "type" "TransferLetterType" NOT NULL,
    "letterDate" TIMESTAMP(3) NOT NULL,
    "entityId" TEXT NOT NULL,
    "sourceBankAccountId" TEXT,
    "sourceBankName" TEXT NOT NULL,
    "sourceBranch" TEXT,
    "sourceAccountNumber" TEXT NOT NULL,
    "beneficiaryBankAccountId" TEXT,
    "beneficiaryBankName" TEXT NOT NULL,
    "beneficiaryName" TEXT NOT NULL,
    "beneficiaryAccountNumber" TEXT,
    "beneficiaryIban" TEXT,
    "beneficiarySortCode" TEXT,
    "beneficiarySwiftCode" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "amountInWords" TEXT NOT NULL,
    "purpose" TEXT,
    "mobileNo" TEXT,
    "email" TEXT,
    "specialInstructions" TEXT,
    "chargesOnBeneficiary" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransferLetter_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "TransferLetter_entityId_letterDate_idx" ON "TransferLetter" ("entityId", "letterDate")`,
  `CREATE INDEX IF NOT EXISTS "TransferLetter_type_idx" ON "TransferLetter" ("type")`,
  `CREATE INDEX IF NOT EXISTS "TransferLetter_deletedAt_idx" ON "TransferLetter" ("deletedAt")`,
  `DO $$ BEGIN
    ALTER TABLE "TransferLetter" ADD CONSTRAINT "TransferLetter_entityId_fkey"
      FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
    ALTER TABLE "TransferLetter" ADD CONSTRAINT "TransferLetter_sourceBankAccountId_fkey"
      FOREIGN KEY ("sourceBankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
    ALTER TABLE "TransferLetter" ADD CONSTRAINT "TransferLetter_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
    ALTER TABLE "TransferLetter" ADD CONSTRAINT "TransferLetter_beneficiaryBankAccountId_fkey"
      FOREIGN KEY ("beneficiaryBankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

const TRANSFER_LETTERS_MIGRATION_STATEMENTS = [
  `ALTER TABLE "TransferLetter" ADD COLUMN IF NOT EXISTS "beneficiaryBankAccountId" TEXT`,
  `DO $$ BEGIN
    ALTER TABLE "TransferLetter" ADD CONSTRAINT "TransferLetter_beneficiaryBankAccountId_fkey"
      FOREIGN KEY ("beneficiaryBankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

function isIgnorable(message) {
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
        AND table_name = $1
        AND column_name = $2
    )`,
    [tableName, columnName],
  );
  return Boolean(result.rows[0]?.exists);
}

async function main() {
  const connectionString =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL;

  if (!connectionString) {
    console.error("No database URL configured.");
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    if (!(await tableExists(client, "TransferLetter"))) {
      for (const statement of TRANSFER_LETTERS_SCHEMA_STATEMENTS) {
        try {
          await client.query(statement);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (isIgnorable(message)) continue;
          throw error;
        }
      }

      if (!(await tableExists(client, "TransferLetter"))) {
        throw new Error("TransferLetter table still missing after sync.");
      }

      console.log("Transfer letters schema sync complete.");
      return;
    }

    if (!(await columnExists(client, "TransferLetter", "beneficiaryBankAccountId"))) {
      for (const statement of TRANSFER_LETTERS_MIGRATION_STATEMENTS) {
        try {
          await client.query(statement);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (isIgnorable(message)) continue;
          throw error;
        }
      }
      console.log("Transfer letters beneficiary account migration complete.");
      return;
    }

    console.log("TransferLetter table already exists — skipping.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Transfer letters schema sync failed:", error);
  process.exit(1);
});
