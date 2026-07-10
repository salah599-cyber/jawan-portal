import { db } from "@/lib/db";
import {
  EXIT_SETTLEMENT_SCHEMA_COLUMN_CHECK_SQL,
  EXIT_SETTLEMENT_SCHEMA_STATEMENTS,
  isIgnorableExitSettlementSchemaError,
} from "@/lib/db/exit-settlement-schema-statements";

let ensurePromise: Promise<void> | null = null;

async function exitSettlementSchemaReady(): Promise<boolean> {
  const rows = await db.$queryRawUnsafe<Array<{ exists: boolean }>>(
    EXIT_SETTLEMENT_SCHEMA_COLUMN_CHECK_SQL,
  );
  return Boolean(rows[0]?.exists);
}

async function applyExitSettlementSchema() {
  for (const statement of EXIT_SETTLEMENT_SCHEMA_STATEMENTS) {
    try {
      await db.$executeRawUnsafe(statement);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isIgnorableExitSettlementSchemaError(message)) continue;
      throw new Error(`Exit settlement schema statement failed: ${message}`);
    }
  }

  if (!(await exitSettlementSchemaReady())) {
    throw new Error("Exit settlement schema sync finished but AssetExit.settlementStatus is still missing.");
  }
}

export function ensureExitSettlementSchema() {
  if (!ensurePromise) {
    ensurePromise = applyExitSettlementSchema().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
}
