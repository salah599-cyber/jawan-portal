import { Client } from "pg";
import {
  isIgnorablePublicMarketsSchemaError,
  PUBLIC_MARKETS_SCHEMA_COLUMN_CHECK_SQL,
  PUBLIC_MARKETS_SCHEMA_STATEMENTS,
} from "@/lib/db/public-markets-schema-statements";

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

async function publicMarketsColumnExists(client: Client): Promise<boolean> {
  const result = await client.query(PUBLIC_MARKETS_SCHEMA_COLUMN_CHECK_SQL);
  return Boolean(result.rows[0]?.exists);
}

async function applyPublicMarketsSchema() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("No database URL is configured for public markets schema sync.");
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    if (await publicMarketsColumnExists(client)) {
      return;
    }

    for (const statement of PUBLIC_MARKETS_SCHEMA_STATEMENTS) {
      try {
        await client.query(statement);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isIgnorablePublicMarketsSchemaError(message)) continue;
        throw new Error(`Public markets schema statement failed: ${message}`);
      }
    }

    if (!(await publicMarketsColumnExists(client))) {
      throw new Error(
        "Public markets schema sync finished but PublicEquityHolding.priceFetchedAt is still missing.",
      );
    }
  } finally {
    await client.end();
  }
}

export function ensurePublicMarketsSchema() {
  if (!ensurePromise) {
    ensurePromise = applyPublicMarketsSchema().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
}

export async function isPublicMarketsSchemaReady() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) return false;

  const client = new Client({ connectionString });
  try {
    await client.connect();
    return await publicMarketsColumnExists(client);
  } catch {
    return false;
  } finally {
    await client.end();
  }
}
