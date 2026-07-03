import { Client } from "pg";
import {
  CALENDAR_SCHEMA_STATEMENTS,
  isIgnorableCalendarSchemaError,
} from "@/lib/db/calendar-schema-statements";

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

async function applyCalendarSchema() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("No database URL is configured for calendar schema sync.");
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    if (await tableExists(client, "Task")) {
      return;
    }

    for (const statement of CALENDAR_SCHEMA_STATEMENTS) {
      try {
        await client.query(statement);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isIgnorableCalendarSchemaError(message)) continue;
        throw new Error(`Calendar schema statement failed: ${message}`);
      }
    }

    if (!(await tableExists(client, "Task"))) {
      throw new Error("Calendar schema sync finished but Task table is still missing.");
    }
  } finally {
    await client.end();
  }
}

export function ensureCalendarSchema() {
  if (!ensurePromise) {
    ensurePromise = applyCalendarSchema().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
}

export async function isCalendarSchemaReady() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) return false;

  const client = new Client({ connectionString });
  try {
    await client.connect();
    return await tableExists(client, "Task");
  } catch {
    return false;
  } finally {
    await client.end();
  }
}
