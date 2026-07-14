import { Client } from "pg";
import {
  CONTACTS_SCHEMA_MIGRATION_STATEMENTS,
  CONTACTS_SCHEMA_STATEMENTS,
  isIgnorableContactsSchemaError,
} from "@/lib/db/contacts-schema-statements";

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
      if (isIgnorableContactsSchemaError(message)) continue;
      throw new Error(`Contacts schema statement failed: ${message}`);
    }
  }
}

async function applyContactsSchema() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("No database URL is configured for contacts schema sync.");
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    if (!(await tableExists(client, "DirectoryContact"))) {
      await runStatements(client, CONTACTS_SCHEMA_STATEMENTS);

      if (!(await tableExists(client, "DirectoryContact"))) {
        throw new Error("Contacts schema sync finished but DirectoryContact table is still missing.");
      }
    }

    await runStatements(client, CONTACTS_SCHEMA_MIGRATION_STATEMENTS);
  } finally {
    await client.end();
  }
}

export function ensureContactsSchema() {
  if (!ensurePromise) {
    ensurePromise = applyContactsSchema().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
}

export async function isContactsSchemaReady() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) return false;

  const client = new Client({ connectionString });
  try {
    await client.connect();
    return await tableExists(client, "DirectoryContact");
  } catch {
    return false;
  } finally {
    await client.end();
  }
}
