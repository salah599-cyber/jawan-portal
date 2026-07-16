export const TRANSFER_LETTERS_SCHEMA_STATEMENTS = [
  `CREATE TYPE "TransferLetterType" AS ENUM ('LOCAL', 'INTERNATIONAL', 'UK')`,
  `CREATE TABLE IF NOT EXISTS "TransferLetter" (
    "id" TEXT NOT NULL,
    "type" "TransferLetterType" NOT NULL,
    "letterDate" TIMESTAMP(3) NOT NULL,
    "entityId" TEXT NOT NULL,
    "sourceBankAccountId" TEXT,
    "sourceBankName" TEXT NOT NULL,
    "sourceBranch" TEXT,
    "sourceAccountNumber" TEXT NOT NULL,
    "beneficiaryBankAccountId" TEXT,
    "beneficiaryBankName" TEXT NOT NULL,
    "beneficiaryName" TEXT NOT NULL,
    "beneficiaryAccountNumber" TEXT,
    "beneficiaryIban" TEXT,
    "beneficiarySortCode" TEXT,
    "beneficiarySwiftCode" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "amountInWords" TEXT NOT NULL,
    "purpose" TEXT,
    "mobileNo" TEXT,
    "email" TEXT,
    "specialInstructions" TEXT,
    "chargesOnBeneficiary" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransferLetter_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "TransferLetter_entityId_letterDate_idx" ON "TransferLetter" ("entityId", "letterDate")`,
  `CREATE INDEX IF NOT EXISTS "TransferLetter_type_idx" ON "TransferLetter" ("type")`,
  `CREATE INDEX IF NOT EXISTS "TransferLetter_deletedAt_idx" ON "TransferLetter" ("deletedAt")`,
  `DO $$ BEGIN
    ALTER TABLE "TransferLetter" ADD CONSTRAINT "TransferLetter_entityId_fkey"
      FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
    ALTER TABLE "TransferLetter" ADD CONSTRAINT "TransferLetter_sourceBankAccountId_fkey"
      FOREIGN KEY ("sourceBankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
    ALTER TABLE "TransferLetter" ADD CONSTRAINT "TransferLetter_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
    ALTER TABLE "TransferLetter" ADD CONSTRAINT "TransferLetter_beneficiaryBankAccountId_fkey"
      FOREIGN KEY ("beneficiaryBankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

export const TRANSFER_LETTERS_MIGRATION_STATEMENTS = [
  `ALTER TABLE "TransferLetter" ADD COLUMN IF NOT EXISTS "beneficiaryBankAccountId" TEXT`,
  `DO $$ BEGIN
    ALTER TABLE "TransferLetter" ADD CONSTRAINT "TransferLetter_beneficiaryBankAccountId_fkey"
      FOREIGN KEY ("beneficiaryBankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];
