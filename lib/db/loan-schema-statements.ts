export const LOAN_SCHEMA_STATEMENTS = [
  `CREATE TYPE "LoanDocumentType" AS ENUM ('LOAN_AGREEMENT', 'PAYMENT_SCHEDULE', 'STATEMENT', 'OTHER')`,
  `CREATE TYPE "LoanPaymentMethod" AS ENUM ('BANK_TRANSFER', 'CHEQUE', 'CASH', 'DIRECT_DEBIT', 'OTHER')`,
  `CREATE TYPE "InterestCalculationMethod" AS ENUM ('REDUCING_BALANCE', 'FIXED_RATE')`,
  `ALTER TABLE "Liability" ADD COLUMN IF NOT EXISTS "outstandingBalance" DECIMAL(18,2)`,
  `ALTER TABLE "Liability" ADD COLUMN IF NOT EXISTS "lastPaymentAt" TIMESTAMP(3)`,
  `ALTER TABLE "Liability" ADD COLUMN IF NOT EXISTS "interestCalculationMethod" "InterestCalculationMethod" DEFAULT 'REDUCING_BALANCE'`,
  `CREATE TABLE IF NOT EXISTS "LoanDocument" (
    "id" TEXT NOT NULL,
    "liabilityId" TEXT NOT NULL,
    "documentType" "LoanDocumentType" NOT NULL,
    "label" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoanDocument_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "LoanDocument_liabilityId_documentType_idx" ON "LoanDocument"("liabilityId", "documentType")`,
  `CREATE TABLE IF NOT EXISTS "LoanPayment" (
    "id" TEXT NOT NULL,
    "liabilityId" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'OMR',
    "principalPortion" DECIMAL(18,2),
    "interestPortion" DECIMAL(18,2),
    "paymentMethod" "LoanPaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "reference" TEXT,
    "notes" TEXT,
    "balanceAfter" DECIMAL(18,2) NOT NULL,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoanPayment_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "LoanPayment_liabilityId_paymentDate_idx" ON "LoanPayment"("liabilityId", "paymentDate")`,
  `CREATE TABLE IF NOT EXISTS "LoanPaymentDocument" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "label" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoanPaymentDocument_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "LoanPaymentDocument_paymentId_idx" ON "LoanPaymentDocument"("paymentId")`,
  `DO $$ BEGIN
    ALTER TABLE "LoanDocument" ADD CONSTRAINT "LoanDocument_liabilityId_fkey"
      FOREIGN KEY ("liabilityId") REFERENCES "Liability"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
    ALTER TABLE "LoanPayment" ADD CONSTRAINT "LoanPayment_liabilityId_fkey"
      FOREIGN KEY ("liabilityId") REFERENCES "Liability"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
    ALTER TABLE "LoanPaymentDocument" ADD CONSTRAINT "LoanPaymentDocument_paymentId_fkey"
      FOREIGN KEY ("paymentId") REFERENCES "LoanPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

export function isIgnorableLoanSchemaError(message: string) {
  return (
    message.includes("already exists") ||
    message.includes("duplicate_object") ||
    message.includes("duplicate key") ||
    message.includes("multiple primary keys")
  );
}

export const LOAN_SCHEMA_TABLE_CHECK_SQL = `
  SELECT EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'LoanPayment'
  ) AS "exists"
`;
