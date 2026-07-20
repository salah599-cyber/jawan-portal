import { Client } from "pg";
import { TRANSFER_LETTERS_MIGRATION_STATEMENTS, TRANSFER_LETTERS_SCHEMA_STATEMENTS } from "@/lib/db/transfer-letters-schema-statements";

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

async function runStatements(client: Client, statements: string[]) {
  for (const statement of statements) {
    try {
      await client.query(statement);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isIgnorableSchemaError(message)) continue;
      throw new Error(`Transfer letters schema statement failed: ${message}`);
    }
  }
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

async function applyTransferLettersSchema() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) return;

  const client = new Client({ connectionString });
  await client.connect();

  try {
    const hasTable = await tableExists(client, "TransferLetter");
    if (!hasTable) {
      await runStatements(client, TRANSFER_LETTERS_SCHEMA_STATEMENTS);
      if (!(await tableExists(client, "TransferLetter"))) {
        throw new Error(
          "Transfer letters schema sync finished but TransferLetter table is still missing.",
        );
      }
      return;
    }

    const needsMigration =
      !(await columnExists(client, "TransferLetter", "beneficiaryBankAccountId")) ||
      !(await columnExists(client, "TransferLetter", "notes")) ||
      !(await columnExists(client, "TransferLetter", "serialNumber")) ||
      !(await columnExists(client, "TransferLetter", "status"));

    if (needsMigration) {
      await runStatements(client, TRANSFER_LETTERS_MIGRATION_STATEMENTS);
    }
  } finally {
    await client.end();
  }
}

export async function ensureTransferLettersSchema() {
  if (!ensurePromise) {
    ensurePromise = applyTransferLettersSchema().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }
  return ensurePromise;
}
