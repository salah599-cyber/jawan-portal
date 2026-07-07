import { db } from "@/lib/db";
import {
  isIgnorablePreciousMetalsSchemaError,
  PRECIOUS_METALS_SCHEMA_STATEMENTS,
  PRECIOUS_METALS_TABLE_CHECK_SQL,
} from "@/lib/db/precious-metals-schema-statements";

let ensurePromise: Promise<void> | null = null;

async function preciousMetalTableExists(): Promise<boolean> {
  const result = await db.$queryRawUnsafe<Array<{ exists: boolean }>>(
    PRECIOUS_METALS_TABLE_CHECK_SQL,
  );
  return Boolean(result[0]?.exists);
}

async function applyPreciousMetalsSchema() {
  if (await preciousMetalTableExists()) return;

  for (const statement of PRECIOUS_METALS_SCHEMA_STATEMENTS) {
    try {
      await db.$executeRawUnsafe(statement);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isIgnorablePreciousMetalsSchemaError(message)) continue;
      throw new Error(`Precious metals schema statement failed: ${message}`);
    }
  }

  if (!(await preciousMetalTableExists())) {
    throw new Error("Precious metals schema sync finished but PreciousMetalDetail table is still missing.");
  }
}

export function ensurePreciousMetalsSchema() {
  if (!ensurePromise) {
    ensurePromise = applyPreciousMetalsSchema().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
}
