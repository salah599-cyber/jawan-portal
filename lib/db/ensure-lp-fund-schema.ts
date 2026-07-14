import { db } from "@/lib/db";
import {
  isIgnorableLpFundSchemaError,
  LP_FUND_ENUM_STATEMENTS,
  LP_FUND_SCHEMA_TABLE_CHECK_SQL,
  LP_FUND_TABLE_STATEMENTS,
} from "@/lib/db/lp-fund-schema-statements";

let ensurePromise: Promise<void> | null = null;

async function lpFundSchemaReady(): Promise<boolean> {
  const rows = await db.$queryRawUnsafe<Array<{ exists: boolean }>>(
    LP_FUND_SCHEMA_TABLE_CHECK_SQL,
  );
  return Boolean(rows[0]?.exists);
}

async function runStatements(statements: readonly string[]) {
  for (const statement of statements) {
    try {
      await db.$executeRawUnsafe(statement);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isIgnorableLpFundSchemaError(message)) continue;
      throw new Error(`LP fund schema statement failed: ${message}`);
    }
  }
}

async function applyLpFundSchema() {
  // Enum values must be applied even when tables already exist (e.g. after a
  // partial deploy) so asset rows can use category FUND_LP.
  await runStatements(LP_FUND_ENUM_STATEMENTS);

  if (await lpFundSchemaReady()) {
    return;
  }

  await runStatements(LP_FUND_TABLE_STATEMENTS);

  if (!(await lpFundSchemaReady())) {
    throw new Error("LP fund schema sync finished but LpCommitment table is still missing.");
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
  try {
    return await lpFundSchemaReady();
  } catch {
    return false;
  }
}
