import { Client } from "pg";
import {
  FAMILY_SCHEMA_MIGRATION_STATEMENTS,
  FAMILY_SCHEMA_STATEMENTS,
  isIgnorableFamilySchemaError,
} from "@/lib/db/family-schema-statements";

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
      if (isIgnorableFamilySchemaError(message)) continue;
      throw new Error(`Family schema statement failed: ${message}`);
    }
  }
}

async function applyFamilySchema() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("No database URL is configured for family schema sync.");
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    if (!(await tableExists(client, "FamilyMember"))) {
      await runStatements(client, FAMILY_SCHEMA_STATEMENTS);

      if (!(await tableExists(client, "FamilyMember"))) {
        throw new Error("Family schema sync finished but FamilyMember table is still missing.");
      }
    }

    await runStatements(client, FAMILY_SCHEMA_MIGRATION_STATEMENTS);
  } finally {
    await client.end();
  }
}

export function ensureFamilySchema() {
  if (!ensurePromise) {
    ensurePromise = applyFamilySchema().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
}

export async function isFamilySchemaReady() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) return false;

  const client = new Client({ connectionString });
  try {
    await client.connect();
    return await tableExists(client, "FamilyMember");
  } catch {
    return false;
  } finally {
    await client.end();
  }
}
