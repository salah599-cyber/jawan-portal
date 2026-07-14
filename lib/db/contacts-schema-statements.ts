export const CONTACTS_SCHEMA_STATEMENTS = [
  `ALTER TYPE "ModuleName" ADD VALUE IF NOT EXISTS 'CONTACTS'`,
  `CREATE TYPE "DirectoryContactType" AS ENUM ('BANKER', 'LAWYER', 'FUND_MANAGER', 'BROKER', 'TENANT', 'CONTRACTOR', 'CO_INVESTOR', 'GOVERNMENT', 'ADVISOR', 'OTHER')`,
  `CREATE TABLE IF NOT EXISTS "DirectoryContact" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "organization" TEXT,
    "jobTitle" TEXT,
    "contactType" "DirectoryContactType" NOT NULL DEFAULT 'OTHER',
    "email" TEXT,
    "phonePrimary" TEXT,
    "phoneSecondary" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "website" TEXT,
    "entityId" TEXT,
    "notes" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "lastContactDate" TIMESTAMP(3),
    "nextFollowUpDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DirectoryContact_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "DirectoryContact_fullName_idx" ON "DirectoryContact" ("fullName")`,
  `CREATE INDEX IF NOT EXISTS "DirectoryContact_contactType_idx" ON "DirectoryContact" ("contactType")`,
  `CREATE INDEX IF NOT EXISTS "DirectoryContact_entityId_idx" ON "DirectoryContact" ("entityId")`,
  `CREATE INDEX IF NOT EXISTS "DirectoryContact_nextFollowUpDate_idx" ON "DirectoryContact" ("nextFollowUpDate")`,
];

export const CONTACTS_SCHEMA_MIGRATION_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "DirectoryContactEmail" (
    "id" TEXT NOT NULL,
    "directoryContactId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "label" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DirectoryContactEmail_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "DirectoryContactEmail_directoryContactId_idx" ON "DirectoryContactEmail" ("directoryContactId")`,
  `DO $$ BEGIN
    ALTER TABLE "DirectoryContactEmail" ADD CONSTRAINT "DirectoryContactEmail_directoryContactId_fkey"
      FOREIGN KEY ("directoryContactId") REFERENCES "DirectoryContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS "DirectoryContactPhone" (
    "id" TEXT NOT NULL,
    "directoryContactId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT '+968',
    "phone" TEXT NOT NULL,
    "label" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DirectoryContactPhone_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "DirectoryContactPhone_directoryContactId_idx" ON "DirectoryContactPhone" ("directoryContactId")`,
  `DO $$ BEGIN
    ALTER TABLE "DirectoryContactPhone" ADD CONSTRAINT "DirectoryContactPhone_directoryContactId_fkey"
      FOREIGN KEY ("directoryContactId") REFERENCES "DirectoryContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `INSERT INTO "DirectoryContactEmail" ("id", "directoryContactId", "email", "label", "sortOrder", "createdAt")
    SELECT
      'dce_' || substr(md5(c.id || c.email || c."createdAt"::text), 1, 24),
      c.id,
      TRIM(c.email),
      'Primary',
      0,
      CURRENT_TIMESTAMP
    FROM "DirectoryContact" c
    WHERE c.email IS NOT NULL
      AND TRIM(c.email) <> ''
      AND NOT EXISTS (
        SELECT 1 FROM "DirectoryContactEmail" e WHERE e."directoryContactId" = c.id
      )`,
  `INSERT INTO "DirectoryContactPhone" ("id", "directoryContactId", "countryCode", "phone", "label", "sortOrder", "createdAt")
    SELECT
      'dcp_' || substr(md5(c.id || c."phonePrimary" || '0' || c."createdAt"::text), 1, 24),
      c.id,
      '+968',
      TRIM(c."phonePrimary"),
      'Primary',
      0,
      CURRENT_TIMESTAMP
    FROM "DirectoryContact" c
    WHERE c."phonePrimary" IS NOT NULL
      AND TRIM(c."phonePrimary") <> ''
      AND NOT EXISTS (
        SELECT 1 FROM "DirectoryContactPhone" p WHERE p."directoryContactId" = c.id AND p."sortOrder" = 0
      )`,
  `INSERT INTO "DirectoryContactPhone" ("id", "directoryContactId", "countryCode", "phone", "label", "sortOrder", "createdAt")
    SELECT
      'dcp_' || substr(md5(c.id || c."phoneSecondary" || '1' || c."createdAt"::text), 1, 24),
      c.id,
      '+968',
      TRIM(c."phoneSecondary"),
      'Secondary',
      1,
      CURRENT_TIMESTAMP
    FROM "DirectoryContact" c
    WHERE c."phoneSecondary" IS NOT NULL
      AND TRIM(c."phoneSecondary") <> ''
      AND NOT EXISTS (
        SELECT 1 FROM "DirectoryContactPhone" p WHERE p."directoryContactId" = c.id AND p."sortOrder" = 1
      )`,
];

export function isIgnorableContactsSchemaError(message: string) {
  return (
    message.includes("already exists") ||
    message.includes("duplicate_object") ||
    message.includes("duplicate key") ||
    message.includes("IF NOT EXISTS")
  );
}
