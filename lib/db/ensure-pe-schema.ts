import { db } from "@/lib/db";
import {
  isIgnorablePeSchemaError,
  PE_SCHEMA_STATEMENTS,
  PE_SCHEMA_TABLE_CHECK_SQL,
} from "@/lib/db/pe-schema-statements";

let ensurePromise: Promise<void> | null = null;

async function peSchemaReady(): Promise<boolean> {
  const rows = await db.$queryRawUnsafe<Array<{ exists: boolean }>>(PE_SCHEMA_TABLE_CHECK_SQL);
  return Boolean(rows[0]?.exists);
}

async function applyPeSchema() {
  if (await peSchemaReady()) {
    return;
  }

  for (const statement of PE_SCHEMA_STATEMENTS) {
    try {
      await db.$executeRawUnsafe(statement);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isIgnorablePeSchemaError(message)) continue;
      throw new Error(`PE schema statement failed: ${message}`);
    }
  }

  if (!(await peSchemaReady())) {
    throw new Error("PE schema sync finished but PeCompanyDocument table is still missing.");
  }
}

export function ensurePeSchema() {
  if (!ensurePromise) {
    ensurePromise = applyPeSchema().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
}

export async function isPeSchemaReady() {
  try {
    return await peSchemaReady();
  } catch {
    return false;
  }
}
