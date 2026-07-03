/**
 * Idempotently applies Fund LP Investments tables to an existing production database.
 */
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const { Client } = require("pg");

const LP_FUND_SCHEMA_STATEMENTS = [
  `ALTER TYPE "ModuleName" ADD VALUE IF NOT EXISTS 'FUND_LP'`,
  `ALTER TYPE "AssetCategory" ADD VALUE IF NOT EXISTS 'FUND_LP'`,
  `CREATE TYPE "LpFundStrategy" AS ENUM ('BUYOUT', 'VENTURE', 'GROWTH', 'REAL_ASSETS', 'CREDIT', 'FUND_OF_FUNDS', 'OTHER')`,
  `CREATE TYPE "LpFundStatus" AS ENUM ('ACTIVE', 'FULLY_INVESTED', 'HARVESTING', 'LIQUIDATED')`,
  `CREATE TYPE "LpCommitmentStatus" AS ENUM ('ACTIVE', 'FULLY_CALLED', 'HARVESTING', 'CLOSED', 'WRITTEN_OFF')`,
  `CREATE TYPE "LpCapitalCallStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED')`,
  `CREATE TYPE "LpDistributionType" AS ENUM ('RETURN_OF_CAPITAL', 'INCOME', 'CARRY', 'RECALLABLE', 'OTHER')`,
  `CREATE TYPE "LpNavSource" AS ENUM ('GP_REPORT', 'ESTIMATE', 'MANUAL')`,
  `CREATE TYPE "LpDocumentType" AS ENUM ('CAPITAL_CALL_NOTICE', 'GP_REPORT', 'QUARTERLY_LETTER', 'SIDE_LETTER', 'SUBSCRIPTION_DOC', 'OTHER')`,
  `CREATE TABLE IF NOT EXISTS "LpGpManager" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LpGpManager_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "LpGpManager_name_idx" ON "LpGpManager" ("name")`,
  `CREATE TABLE IF NOT EXISTS "LpFund" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gpManagerId" TEXT,
    "strategy" "LpFundStrategy" NOT NULL DEFAULT 'OTHER',
    "vintageYear" INTEGER,
    "fundSize" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "fundTermYears" INTEGER,
    "investmentPeriodEnd" TIMESTAMP(3),
    "status" "LpFundStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LpFund_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "LpFund_gpManagerId_idx" ON "LpFund" ("gpManagerId")`,
  `CREATE INDEX IF NOT EXISTS "LpFund_status_vintageYear_idx" ON "LpFund" ("status", "vintageYear")`,
  `CREATE TABLE IF NOT EXISTS "LpCommitment" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "assetId" TEXT,
    "commitmentAmount" DECIMAL(18,2) NOT NULL,
    "commitmentDate" TIMESTAMP(3) NOT NULL,
    "commitmentCurrency" TEXT NOT NULL DEFAULT 'USD',
    "status" "LpCommitmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "sideLetterNotes" TEXT,
    "ownershipPctOfFund" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LpCommitment_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "LpCommitment_fundId_entityId_key" ON "LpCommitment" ("fundId", "entityId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "LpCommitment_assetId_key" ON "LpCommitment" ("assetId")`,
  `CREATE INDEX IF NOT EXISTS "LpCommitment_entityId_status_idx" ON "LpCommitment" ("entityId", "status")`,
  `CREATE TABLE IF NOT EXISTS "LpCapitalCall" (
    "id" TEXT NOT NULL,
    "commitmentId" TEXT NOT NULL,
    "callDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "LpCapitalCallStatus" NOT NULL DEFAULT 'PENDING',
    "paidDate" TIMESTAMP(3),
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LpCapitalCall_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "LpCapitalCall_commitmentId_callDate_idx" ON "LpCapitalCall" ("commitmentId", "callDate")`,
  `CREATE INDEX IF NOT EXISTS "LpCapitalCall_commitmentId_status_idx" ON "LpCapitalCall" ("commitmentId", "status")`,
  `CREATE INDEX IF NOT EXISTS "LpCapitalCall_dueDate_idx" ON "LpCapitalCall" ("dueDate")`,
  `CREATE TABLE IF NOT EXISTS "LpDistribution" (
    "id" TEXT NOT NULL,
    "commitmentId" TEXT NOT NULL,
    "distributionDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "distributionType" "LpDistributionType" NOT NULL DEFAULT 'RETURN_OF_CAPITAL',
    "isRecallable" BOOLEAN NOT NULL DEFAULT false,
    "recalledAmount" DECIMAL(18,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LpDistribution_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "LpDistribution_commitmentId_distributionDate_idx" ON "LpDistribution" ("commitmentId", "distributionDate")`,
  `CREATE TABLE IF NOT EXISTS "LpNavUpdate" (
    "id" TEXT NOT NULL,
    "commitmentId" TEXT NOT NULL,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "nav" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "source" "LpNavSource" NOT NULL DEFAULT 'GP_REPORT',
    "gpReportedTvpi" DECIMAL(8,4),
    "gpReportedIrr" DECIMAL(8,4),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LpNavUpdate_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "LpNavUpdate_commitmentId_asOfDate_idx" ON "LpNavUpdate" ("commitmentId", "asOfDate")`,
  `CREATE TABLE IF NOT EXISTS "LpFundDocument" (
    "id" TEXT NOT NULL,
    "fundId" TEXT,
    "commitmentId" TEXT,
    "documentType" "LpDocumentType" NOT NULL DEFAULT 'OTHER',
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "notes" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LpFundDocument_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "LpFundDocument_fundId_documentType_idx" ON "LpFundDocument" ("fundId", "documentType")`,
  `CREATE INDEX IF NOT EXISTS "LpFundDocument_commitmentId_documentType_idx" ON "LpFundDocument" ("commitmentId", "documentType")`,
];

function getDatabaseUrl() {
  return (
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL
  );
}

function isIgnorableSchemaError(message) {
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
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    console.log("No database URL set; skipping LP fund schema sync.");
    return;
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    if (await tableExists(client, "LpCommitment")) {
      console.log("LP fund schema already present; nothing to do.");
      return;
    }

    for (const statement of LP_FUND_SCHEMA_STATEMENTS) {
      try {
        await client.query(statement);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isIgnorableSchemaError(message)) continue;
        throw error;
      }
    }

    if (!(await tableExists(client, "LpCommitment"))) {
      throw new Error("LP fund schema sync finished but LpCommitment table is still missing.");
    }

    console.log("LP fund schema applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("LP fund schema sync failed:", error);
  process.exit(1);
});
