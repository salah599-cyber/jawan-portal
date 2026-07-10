export const EXIT_SETTLEMENT_SCHEMA_STATEMENTS = [
  `CREATE TYPE "ExitProceedSettlementStatus" AS ENUM ('PENDING', 'SETTLED', 'NONE')`,
  `ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "isExitSuspense" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "AssetExit" ADD COLUMN IF NOT EXISTS "settlementStatus" "ExitProceedSettlementStatus" NOT NULL DEFAULT 'NONE'`,
  `ALTER TABLE "AssetExit" ADD COLUMN IF NOT EXISTS "suspenseBankAccountId" TEXT`,
  `ALTER TABLE "AssetExit" ADD COLUMN IF NOT EXISTS "settledBankAccountId" TEXT`,
  `ALTER TABLE "AssetExit" ADD COLUMN IF NOT EXISTS "settledAt" TIMESTAMP(3)`,
];

export function isIgnorableExitSettlementSchemaError(message: string) {
  return (
    message.includes("already exists") ||
    message.includes("duplicate_object") ||
    message.includes("duplicate key")
  );
}

export const EXIT_SETTLEMENT_SCHEMA_COLUMN_CHECK_SQL = `
  SELECT EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'AssetExit'
      AND a.attname = 'settlementStatus'
      AND a.attnum > 0
      AND NOT a.attisdropped
  ) AS "exists"
`;
