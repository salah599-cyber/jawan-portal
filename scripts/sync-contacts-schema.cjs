/**
 * Idempotently applies Contacts Directory tables to an existing production database.
 */
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const { Client } = require("pg");

const CONTACTS_SCHEMA_STATEMENTS = [
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

function isIgnorable(message) {
  return (
    message.includes("already exists") ||
    message.includes("duplicate_object") ||
    message.includes("duplicate key") ||
    message.includes("IF NOT EXISTS")
  );
}

async function tableExists(client, tableName) {
  const result = await client.query(
    `SELECT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = $1
    )`,
    [tableName],
  );
  return Boolean(result.rows[0]?.exists);
}

async function main() {
  const connectionString =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL;

  if (!connectionString) {
    console.error("No database URL configured.");
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    if (await tableExists(client, "DirectoryContact")) {
      console.log("DirectoryContact table already exists — skipping.");
      return;
    }

    for (const statement of CONTACTS_SCHEMA_STATEMENTS) {
      try {
        await client.query(statement);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isIgnorable(message)) continue;
        throw error;
      }
    }

    if (!(await tableExists(client, "DirectoryContact"))) {
      throw new Error("DirectoryContact table still missing after sync.");
    }

    console.log("Contacts schema sync complete.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Contacts schema sync failed:", error);
  process.exit(1);
});
