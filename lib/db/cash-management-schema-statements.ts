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

export const CASH_MANAGEMENT_MIGRATION_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "BankAccountNumber" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'OMR',
    "label" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankAccountNumber_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "BankAccountNumber_bankAccountId_idx" ON "BankAccountNumber" ("bankAccountId")`,
  `CREATE INDEX IF NOT EXISTS "BankAccountNumber_accountNumber_idx" ON "BankAccountNumber" ("accountNumber")`,
  `DO $$ BEGIN
    ALTER TABLE "BankAccountNumber" ADD CONSTRAINT "BankAccountNumber_bankAccountId_fkey"
      FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `INSERT INTO "BankAccountNumber" ("id", "bankAccountId", "accountNumber", "currency", "sortOrder", "createdAt")
    SELECT
      'ban_' || substr(md5(b.id || b."accountNumber" || b."createdAt"::text), 1, 24),
      b.id,
      TRIM(b."accountNumber"),
      COALESCE(NULLIF(TRIM(b.currency), ''), 'OMR'),
      0,
      CURRENT_TIMESTAMP
    FROM "BankAccount" b
    WHERE b."accountNumber" IS NOT NULL
      AND TRIM(b."accountNumber") <> ''
      AND NOT EXISTS (
        SELECT 1 FROM "BankAccountNumber" n WHERE n."bankAccountId" = b.id
      )`,
];
