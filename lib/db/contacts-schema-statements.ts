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

export function isIgnorableContactsSchemaError(message: string) {
  return (
    message.includes("already exists") ||
    message.includes("duplicate_object") ||
    message.includes("duplicate key") ||
    message.includes("IF NOT EXISTS")
  );
}
