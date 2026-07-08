import { db } from "@/lib/db";
import {
  isIgnorableLoanSchemaError,
  LOAN_SCHEMA_STATEMENTS,
  LOAN_SCHEMA_TABLE_CHECK_SQL,
} from "@/lib/db/loan-schema-statements";

let ensurePromise: Promise<void> | null = null;

async function loanSchemaReady(): Promise<boolean> {
  const rows = await db.$queryRawUnsafe<Array<{ exists: boolean }>>(LOAN_SCHEMA_TABLE_CHECK_SQL);
  return Boolean(rows[0]?.exists);
}

async function applyLoanSchema() {
  const ready = await loanSchemaReady();

  for (const statement of LOAN_SCHEMA_STATEMENTS) {
    try {
      await db.$executeRawUnsafe(statement);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isIgnorableLoanSchemaError(message)) continue;
      throw new Error(`Loan schema statement failed: ${message}`);
    }
  }

  if (!(await loanSchemaReady())) {
    throw new Error("Loan schema sync finished but LoanPayment table is still missing.");
  }

  if (ready) {
    return;
  }
}

export function ensureLoanSchema() {
  if (!ensurePromise) {
    ensurePromise = applyLoanSchema().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
}

export async function isLoanSchemaReady() {
  try {
    return await loanSchemaReady();
  } catch {
    return false;
  }
}
