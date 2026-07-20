export const TRANSFER_LETTERS_SCHEMA_STATEMENTS = [
  `CREATE TYPE "TransferLetterType" AS ENUM ('LOCAL', 'INTERNATIONAL', 'UK', 'USA')`,
  `CREATE TYPE "TransferLetterStatus" AS ENUM ('PENDING', 'COMPLETE')`,
  `CREATE TABLE IF NOT EXISTS "TransferLetter" (
    "id" TEXT NOT NULL,
    "serialNumber" SERIAL NOT NULL,
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
    "notes" TEXT,
    "mobileNo" TEXT,
    "email" TEXT,
    "specialInstructions" TEXT,
    "chargesOnBeneficiary" BOOLEAN NOT NULL DEFAULT false,
    "status" "TransferLetterStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransferLetter_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "TransferLetter_entityId_letterDate_idx" ON "TransferLetter" ("entityId", "letterDate")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "TransferLetter_serialNumber_key" ON "TransferLetter" ("serialNumber")`,
  `CREATE INDEX IF NOT EXISTS "TransferLetter_type_idx" ON "TransferLetter" ("type")`,
  `CREATE INDEX IF NOT EXISTS "TransferLetter_status_idx" ON "TransferLetter" ("status")`,
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
  `DO $$ BEGIN
    CREATE TYPE "TransferLetterStatus" AS ENUM ('PENDING', 'COMPLETE');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `ALTER TABLE "TransferLetter" ADD COLUMN IF NOT EXISTS "status" "TransferLetterStatus" NOT NULL DEFAULT 'PENDING'`,
  `CREATE INDEX IF NOT EXISTS "TransferLetter_status_idx" ON "TransferLetter" ("status")`,
  `ALTER TABLE "TransferLetter" ADD COLUMN IF NOT EXISTS "notes" TEXT`,
  `ALTER TABLE "TransferLetter" ADD COLUMN IF NOT EXISTS "beneficiaryBankAccountId" TEXT`,
  `ALTER TABLE "TransferLetter" ADD COLUMN IF NOT EXISTS "serialNumber" INTEGER`,
  `WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, id ASC) AS rn
    FROM "TransferLetter"
    WHERE "serialNumber" IS NULL
  )
  UPDATE "TransferLetter" t
  SET "serialNumber" = n.rn
  FROM numbered n
  WHERE t.id = n.id`,
  `CREATE SEQUENCE IF NOT EXISTS "TransferLetter_serialNumber_seq"`,
  `DO $$ DECLARE
    max_serial INTEGER;
    has_rows BOOLEAN;
  BEGIN
    SELECT COALESCE(MAX("serialNumber"), 0) INTO max_serial FROM "TransferLetter";
    SELECT EXISTS(SELECT 1 FROM "TransferLetter" LIMIT 1) INTO has_rows;
    IF has_rows THEN
      PERFORM setval('"TransferLetter_serialNumber_seq"', max_serial, true);
    ELSE
      PERFORM setval('"TransferLetter_serialNumber_seq"', 1, false);
    END IF;
  END $$`,
  `ALTER TABLE "TransferLetter" ALTER COLUMN "serialNumber" SET DEFAULT nextval('"TransferLetter_serialNumber_seq"')`,
  `ALTER SEQUENCE "TransferLetter_serialNumber_seq" OWNED BY "TransferLetter"."serialNumber"`,
  `ALTER TABLE "TransferLetter" ALTER COLUMN "serialNumber" SET NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "TransferLetter_serialNumber_key" ON "TransferLetter" ("serialNumber")`,
  `DO $$ BEGIN
    ALTER TABLE "TransferLetter" ADD CONSTRAINT "TransferLetter_beneficiaryBankAccountId_fkey"
      FOREIGN KEY ("beneficiaryBankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `ALTER TYPE "TransferLetterType" ADD VALUE IF NOT EXISTS 'USA'`,
  `ALTER TABLE "TransferLetter" ADD COLUMN IF NOT EXISTS "beneficiaryRoutingNumber" TEXT`,
  `ALTER TABLE "TransferLetter" ADD COLUMN IF NOT EXISTS "correspondentBankName" TEXT`,
  `ALTER TABLE "TransferLetter" ADD COLUMN IF NOT EXISTS "correspondentSwiftCode" TEXT`,
  `ALTER TABLE "TransferLetter" ADD COLUMN IF NOT EXISTS "correspondentRoutingNumber" TEXT`,
  `ALTER TABLE "TransferLetter" ADD COLUMN IF NOT EXISTS "correspondentFfcInstructions" TEXT`,
];
