/**
 * Idempotently applies Insurance Register tables to an existing production database.
 */
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const { Client } = require("pg");

const INSURANCE_SCHEMA_STATEMENTS = [
  `ALTER TYPE "ModuleName" ADD VALUE IF NOT EXISTS 'INSURANCE'`,
  `CREATE TYPE "InsurancePolicyType" AS ENUM ('PROPERTY', 'VEHICLE', 'LIFE', 'HEALTH', 'BUSINESS', 'OTHER')`,
  `CREATE TYPE "InsurancePolicyStatus" AS ENUM ('ACTIVE', 'PENDING_RENEWAL', 'EXPIRED', 'CANCELLED')`,
  `CREATE TYPE "InsurancePremiumFrequency" AS ENUM ('ANNUAL', 'SEMI_ANNUAL', 'QUARTERLY', 'MONTHLY', 'ONE_TIME')`,
  `CREATE TYPE "InsuranceDocumentType" AS ENUM ('POLICY_SCHEDULE', 'CERTIFICATE', 'ENDORSEMENT', 'CLAIM', 'RENEWAL_NOTICE', 'OTHER')`,
  `CREATE TABLE IF NOT EXISTS "InsurancePolicy" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "policyType" "InsurancePolicyType" NOT NULL,
    "insurer" TEXT NOT NULL,
    "policyNumber" TEXT NOT NULL,
    "policyHolder" TEXT,
    "description" TEXT,
    "premium" DECIMAL(18,2),
    "premiumFrequency" "InsurancePremiumFrequency" NOT NULL DEFAULT 'ANNUAL',
    "coverageAmount" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'OMR',
    "startDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "renewalDate" TIMESTAMP(3),
    "status" "InsurancePolicyStatus" NOT NULL DEFAULT 'ACTIVE',
    "vehicleId" TEXT,
    "rePropertyId" TEXT,
    "landParcelId" TEXT,
    "registeredCompanyId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InsurancePolicy_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "InsurancePolicy_entityId_status_idx" ON "InsurancePolicy" ("entityId", "status")`,
  `CREATE INDEX IF NOT EXISTS "InsurancePolicy_expiryDate_idx" ON "InsurancePolicy" ("expiryDate")`,
  `CREATE INDEX IF NOT EXISTS "InsurancePolicy_policyType_idx" ON "InsurancePolicy" ("policyType")`,
  `CREATE INDEX IF NOT EXISTS "InsurancePolicy_policyNumber_idx" ON "InsurancePolicy" ("policyNumber")`,
  `CREATE TABLE IF NOT EXISTS "InsurancePolicyDocument" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "documentType" "InsuranceDocumentType" NOT NULL DEFAULT 'OTHER',
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "notes" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InsurancePolicyDocument_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "InsurancePolicyDocument_policyId_documentType_idx" ON "InsurancePolicyDocument" ("policyId", "documentType")`,
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
    if (await tableExists(client, "InsurancePolicy")) {
      console.log("InsurancePolicy table already exists — skipping.");
      return;
    }

    for (const statement of INSURANCE_SCHEMA_STATEMENTS) {
      try {
        await client.query(statement);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isIgnorable(message)) continue;
        throw error;
      }
    }

    if (!(await tableExists(client, "InsurancePolicy"))) {
      throw new Error("InsurancePolicy table still missing after sync.");
    }

    console.log("Insurance schema sync complete.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Insurance schema sync failed:", error);
  process.exit(1);
});
