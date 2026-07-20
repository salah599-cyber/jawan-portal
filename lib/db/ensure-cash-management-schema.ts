import { Client } from "pg";
import { CASH_MANAGEMENT_MIGRATION_STATEMENTS, CASH_MANAGEMENT_SCHEMA_STATEMENTS } from "@/lib/db/cash-management-schema-statements";
import { CASH_STATEMENT_IMPORT_SCHEMA_STATEMENTS } from "@/lib/db/cash-statement-import-schema-statements";

let ensurePromise: Promise<void> | null = null;

function getDatabaseUrl() {
  return (
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL
  );
}

function isIgnorableSchemaError(message: string) {
  return (
    message.includes("already exists") ||
    message.includes("duplicate_object") ||
    message.includes("duplicate key") ||
    message.includes("IF NOT EXISTS")
  );
}

async function tableExists(client: Client, tableName: string) {
  const result = await client.query(
    `SELECT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = $1
    )`,
    [tableName],
  );
  return Boolean(result.rows[0]?.exists);
}

async function columnExists(client: Client, tableName: string, columnName: string) {
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

async function runStatements(client: Client, statements: string[]) {
  for (const statement of statements) {
    try {
      await client.query(statement);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isIgnorableSchemaError(message)) continue;
      throw new Error(`Cash management schema statement failed: ${message}`);
    }
  }
}

async function applyCashManagementSchema() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) return;

  const client = new Client({ connectionString });
  await client.connect();

  try {
    const hasBalanceEntryTable = await tableExists(client, "BankBalanceEntry");
    const hasIncludeInCashPosition = await columnExists(
      client,
      "BankAccount",
      "includeInCashPosition",
    );

    if (!hasBalanceEntryTable) {
      await runStatements(client, CASH_MANAGEMENT_SCHEMA_STATEMENTS);
      await runStatements(client, CASH_STATEMENT_IMPORT_SCHEMA_STATEMENTS);
      await runStatements(client, CASH_MANAGEMENT_MIGRATION_STATEMENTS);

      if (!(await tableExists(client, "BankBalanceEntry"))) {
        throw new Error(
          "Cash management schema sync finished but BankBalanceEntry table is still missing.",
        );
      }
      return;
    }

    if (!hasIncludeInCashPosition) {
      await runStatements(client, [
        `ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "includeInCashPosition" BOOLEAN NOT NULL DEFAULT true`,
      ]);
    }

    const hasIncludeInTransferLetterSource = await columnExists(
      client,
      "BankAccount",
      "includeInTransferLetterSource",
    );
    if (!hasIncludeInTransferLetterSource) {
      await runStatements(client, [
        `ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "includeInTransferLetterSource" BOOLEAN NOT NULL DEFAULT true`,
      ]);
    }

    const hasNumberIncludeInTransferLetterSource = await columnExists(
      client,
      "BankAccountNumber",
      "includeInTransferLetterSource",
    );
    if (!hasNumberIncludeInTransferLetterSource) {
      await runStatements(client, [
        `ALTER TABLE "BankAccountNumber" ADD COLUMN IF NOT EXISTS "includeInTransferLetterSource" BOOLEAN NOT NULL DEFAULT true`,
        `UPDATE "BankAccountNumber" n
          SET "includeInTransferLetterSource" = b."includeInTransferLetterSource"
          FROM "BankAccount" b
          WHERE n."bankAccountId" = b.id`,
      ]);
    }

    const hasStatementImportTable = await tableExists(client, "CashStatementImport");
    if (!hasStatementImportTable) {
      await runStatements(client, CASH_STATEMENT_IMPORT_SCHEMA_STATEMENTS);
    } else {
      const hasStatementImportId = await columnExists(
        client,
        "BankBalanceEntry",
        "statementImportId",
      );
      if (!hasStatementImportId) {
        await runStatements(client, [
          `ALTER TABLE "BankBalanceEntry" ADD COLUMN IF NOT EXISTS "statementImportId" TEXT`,
          `CREATE INDEX IF NOT EXISTS "BankBalanceEntry_statementImportId_idx" ON "BankBalanceEntry"("statementImportId")`,
        ]);
      }
    }

    await runStatements(client, CASH_MANAGEMENT_MIGRATION_STATEMENTS);

    const hasCorrespondentBankName = await columnExists(client, "BankAccount", "correspondentBankName");
    if (!hasRegion || !hasRoutingNumber || !hasCorrespondentBankName) {
      await runStatements(client, [
        `DO $$ BEGIN
          CREATE TYPE "BankAccountRegion" AS ENUM ('OMAN', 'USA');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
        `ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "region" "BankAccountRegion" NOT NULL DEFAULT 'OMAN'`,
        `ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "routingNumber" TEXT`,
        `CREATE INDEX IF NOT EXISTS "BankAccount_region_idx" ON "BankAccount" ("region")`,
        `ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "correspondentBankName" TEXT`,
        `ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "correspondentSwiftCode" TEXT`,
        `ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "correspondentRoutingNumber" TEXT`,
        `ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "correspondentFfcInstructions" TEXT`,
      ]);
    }
  } finally {
    await client.end();
  }
}

export async function ensureCashManagementSchema() {
  if (!ensurePromise) {
    ensurePromise = applyCashManagementSchema().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }
  return ensurePromise;
}
