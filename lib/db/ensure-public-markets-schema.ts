import { db } from "@/lib/db";
import {
  isIgnorablePublicMarketsSchemaError,
  PUBLIC_MARKETS_SCHEMA_COLUMN_CHECK_SQL,
  PUBLIC_MARKETS_SCHEMA_STATEMENTS,
} from "@/lib/db/public-markets-schema-statements";

let ensurePromise: Promise<void> | null = null;

async function publicMarketsColumnExists(): Promise<boolean> {
  const rows = await db.$queryRawUnsafe<Array<{ exists: boolean }>>(
    PUBLIC_MARKETS_SCHEMA_COLUMN_CHECK_SQL,
  );
  return Boolean(rows[0]?.exists);
}

async function applyPublicMarketsSchema() {
  if (await publicMarketsColumnExists()) {
    return;
  }

  for (const statement of PUBLIC_MARKETS_SCHEMA_STATEMENTS) {
    try {
      await db.$executeRawUnsafe(statement);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isIgnorablePublicMarketsSchemaError(message)) continue;
      throw new Error(`Public markets schema statement failed: ${message}`);
    }
  }

  if (!(await publicMarketsColumnExists())) {
    throw new Error(
      "Public markets schema sync finished but PublicEquityHolding.market is still missing.",
    );
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
  try {
    return await publicMarketsColumnExists();
  } catch {
    return false;
  }
}
