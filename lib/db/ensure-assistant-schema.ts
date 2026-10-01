import "server-only";

import { Client } from "pg";
import {
  ASSISTANT_SCHEMA_STATEMENTS,
  isIgnorableAssistantSchemaError,
} from "@/lib/db/assistant-schema-statements";

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

async function applyAssistantSchema() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("No database URL is configured for assistant schema sync.");
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    if (
      (await tableExists(client, "AssistantThread")) &&
      (await tableExists(client, "AssistantMessage"))
    ) {
      return;
    }

    for (const statement of ASSISTANT_SCHEMA_STATEMENTS) {
      try {
        await client.query(statement);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isIgnorableAssistantSchemaError(message)) continue;
        throw new Error(`Assistant schema statement failed: ${message}`);
      }
    }

    if (!(await tableExists(client, "AssistantThread"))) {
      throw new Error("Assistant schema sync finished but AssistantThread is still missing.");
    }
  } finally {
    await client.end();
  }
}

export function ensureAssistantSchema() {
  if (!ensurePromise) {
    ensurePromise = applyAssistantSchema().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
}
