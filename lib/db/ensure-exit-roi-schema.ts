import { db } from "@/lib/db";
import {
  EXIT_ROI_SCHEMA_COLUMN_CHECK_SQL,
  EXIT_ROI_SCHEMA_STATEMENTS,
  isIgnorableExitRoiSchemaError,
} from "@/lib/db/exit-roi-schema-statements";

let ensurePromise: Promise<void> | null = null;

async function exitRoiSchemaReady(): Promise<boolean> {
  const rows = await db.$queryRawUnsafe<Array<{ exists: boolean }>>(EXIT_ROI_SCHEMA_COLUMN_CHECK_SQL);
  return Boolean(rows[0]?.exists);
}

async function applyExitRoiSchema() {
  for (const statement of EXIT_ROI_SCHEMA_STATEMENTS) {
    try {
      await db.$executeRawUnsafe(statement);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isIgnorableExitRoiSchemaError(message)) continue;
      throw new Error(`Exit ROI schema statement failed: ${message}`);
    }
  }

  if (!(await exitRoiSchemaReady())) {
    throw new Error("Exit ROI schema sync finished but AssetExit.realizedGainPct is still missing.");
  }
}

export function ensureExitRoiSchema() {
  if (!ensurePromise) {
    ensurePromise = applyExitRoiSchema().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
}

export async function isExitRoiSchemaReady() {
  try {
    return await exitRoiSchemaReady();
  } catch {
    return false;
  }
}
