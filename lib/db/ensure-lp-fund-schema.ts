import { Client } from "pg";
import {
  LP_FUND_SCHEMA_STATEMENTS,
  isIgnorableLpFundSchemaError,
} from "@/lib/db/lp-fund-schema-statements";

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

async function applyLpFundSchema() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("No database URL is configured for LP fund schema sync.");
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    if (await tableExists(client, "LpCommitment")) {
      return;
    }

    for (const statement of LP_FUND_SCHEMA_STATEMENTS) {
      try {
        await client.query(statement);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isIgnorableLpFundSchemaError(message)) continue;
        throw new Error(`LP fund schema statement failed: ${message}`);
      }
    }

    if (!(await tableExists(client, "LpCommitment"))) {
      throw new Error("LP fund schema sync finished but LpCommitment table is still missing.");
    }
  } finally {
    await client.end();
  }
}

export function ensureLpFundSchema() {
  if (!ensurePromise) {
    ensurePromise = applyLpFundSchema().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
}

export async function isLpFundSchemaReady() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) return false;

  const client = new Client({ connectionString });
  try {
    await client.connect();
    return await tableExists(client, "LpCommitment");
  } catch {
    return false;
  } finally {
    await client.end();
  }
}
