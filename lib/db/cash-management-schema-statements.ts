export const CASH_MANAGEMENT_SCHEMA_STATEMENTS = [
  `ALTER TYPE "ModuleName" ADD VALUE IF NOT EXISTS 'CASH_MANAGEMENT'`,
  `ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "currentBalance" DECIMAL(18,3)`,
  `ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "balanceAsOf" TIMESTAMP(3)`,
  `ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true`,
  `CREATE TABLE IF NOT EXISTS "BankBalanceEntry" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "balance" DECIMAL(18,3) NOT NULL,
    "balanceDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankBalanceEntry_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "BankBalanceEntry_bankAccountId_balanceDate_idx" ON "BankBalanceEntry"("bankAccountId", "balanceDate")`,
  `ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "includeInCashPosition" BOOLEAN NOT NULL DEFAULT true`,
];
