/**
 * Idempotently applies Family & Succession tables to an existing production database.
 */
require("./load-env.cjs");

const { Client } = require("pg");

const FAMILY_SCHEMA_STATEMENTS = [
  `ALTER TYPE "ModuleName" ADD VALUE IF NOT EXISTS 'FAMILY_MEMBERS'`,
  `ALTER TYPE "ModuleName" ADD VALUE IF NOT EXISTS 'SUCCESSION'`,
  `CREATE TYPE "FamilyRelationship" AS ENUM ('SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'GRANDCHILD', 'OTHER')`,
  `CREATE TYPE "FamilyMemberIdType" AS ENUM ('OMANI_ID', 'PASSPORT', 'RESIDENCE_CARD', 'OTHER')`,
  `CREATE TYPE "FamilyKycStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETE', 'EXPIRED')`,
  `CREATE TYPE "FamilyMemberDocumentType" AS ENUM ('PASSPORT', 'NATIONAL_ID', 'RESIDENCE', 'PROOF_OF_ADDRESS', 'BIRTH_CERTIFICATE', 'OTHER')`,
  `CREATE TYPE "FamilyOwnershipStakeType" AS ENUM ('ECONOMIC', 'LEGAL_TITLE', 'BENEFICIAL')`,
  `CREATE TYPE "FamilySignatoryRoleType" AS ENUM ('BANK_SIGNATORY', 'COMPANY_DIRECTOR', 'CHEQUE_SIGNATORY', 'POA_HOLDER', 'OTHER')`,
  `CREATE TYPE "BeneficiaryDesignationType" AS ENUM ('PRIMARY', 'CONTINGENT', 'SPECIFIC_BEQUEST')`,
  `CREATE TYPE "SuccessionPlanStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'REVIEW_DUE', 'COMPLETE')`,
  `CREATE TYPE "SuccessionAppointmentRole" AS ENUM ('EXECUTOR', 'TRUSTEE', 'GUARDIAN', 'POA_AGENT', 'ADVISOR')`,
  `CREATE TYPE "SuccessionDocumentType" AS ENUM ('WILL', 'TRUST_DEED', 'LETTER_OF_WISHES', 'POA', 'LIVING_WILL', 'OTHER')`,
  `CREATE TYPE "SuccessionDocumentStatus" AS ENUM ('DRAFT', 'SIGNED', 'FILED', 'MISSING')`,
  `CREATE TABLE IF NOT EXISTS "FamilyMember" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "preferredName" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "nationality" TEXT,
    "relationship" "FamilyRelationship",
    "idType" "FamilyMemberIdType",
    "idNumber" TEXT,
    "idExpiryDate" TIMESTAMP(3),
    "kycStatus" "FamilyKycStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "kycNotes" TEXT,
    "email" TEXT,
    "phonePrimary" TEXT,
    "phoneSecondary" TEXT,
    "address" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "isBeneficiary" BOOLEAN NOT NULL DEFAULT false,
    "deceased" BOOLEAN NOT NULL DEFAULT false,
    "dateOfDeath" TIMESTAMP(3),
    "userId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "FamilyMember_userId_key" ON "FamilyMember" ("userId")`,
  `CREATE INDEX IF NOT EXISTS "FamilyMember_fullName_idx" ON "FamilyMember" ("fullName")`,
  `CREATE INDEX IF NOT EXISTS "FamilyMember_kycStatus_idx" ON "FamilyMember" ("kycStatus")`,
  `CREATE INDEX IF NOT EXISTS "FamilyMember_isBeneficiary_idx" ON "FamilyMember" ("isBeneficiary")`,
  `CREATE TABLE IF NOT EXISTS "FamilyMemberDocument" (
    "id" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "documentType" "FamilyMemberDocumentType" NOT NULL DEFAULT 'OTHER',
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "notes" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FamilyMemberDocument_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "FamilyMemberDocument_familyMemberId_documentType_idx" ON "FamilyMemberDocument" ("familyMemberId", "documentType")`,
  `CREATE TABLE IF NOT EXISTS "FamilyOwnershipStake" (
    "id" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "entityId" TEXT,
    "assetId" TEXT,
    "landParcelId" TEXT,
    "registeredCompanyId" TEXT,
    "rePropertyId" TEXT,
    "vehicleId" TEXT,
    "stakeType" "FamilyOwnershipStakeType" NOT NULL DEFAULT 'ECONOMIC',
    "ownershipPct" DECIMAL(5,2),
    "roleLabel" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FamilyOwnershipStake_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "FamilyOwnershipStake_familyMemberId_idx" ON "FamilyOwnershipStake" ("familyMemberId")`,
  `CREATE INDEX IF NOT EXISTS "FamilyOwnershipStake_entityId_idx" ON "FamilyOwnershipStake" ("entityId")`,
  `CREATE TABLE IF NOT EXISTS "FamilySignatoryRole" (
    "id" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "registeredCompanyId" TEXT,
    "assetId" TEXT,
    "vehicleId" TEXT,
    "roleType" "FamilySignatoryRoleType" NOT NULL DEFAULT 'OTHER',
    "bankName" TEXT,
    "accountRef" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FamilySignatoryRole_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "FamilySignatoryRole_familyMemberId_idx" ON "FamilySignatoryRole" ("familyMemberId")`,
  `CREATE INDEX IF NOT EXISTS "FamilySignatoryRole_entityId_idx" ON "FamilySignatoryRole" ("entityId")`,
  `CREATE TABLE IF NOT EXISTS "BeneficiaryDesignation" (
    "id" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "insurancePolicyId" TEXT,
    "assetId" TEXT,
    "landParcelId" TEXT,
    "registeredCompanyId" TEXT,
    "rePropertyId" TEXT,
    "vehicleId" TEXT,
    "designationType" "BeneficiaryDesignationType" NOT NULL DEFAULT 'PRIMARY',
    "allocationPct" DECIMAL(5,2),
    "effectiveDate" TIMESTAMP(3),
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BeneficiaryDesignation_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "BeneficiaryDesignation_familyMemberId_idx" ON "BeneficiaryDesignation" ("familyMemberId")`,
  `CREATE TABLE IF NOT EXISTS "SuccessionPlan" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "SuccessionPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "entityId" TEXT,
    "generalInstructions" TEXT,
    "incapacitationNotes" TEXT,
    "lastReviewDate" TIMESTAMP(3),
    "nextReviewDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SuccessionPlan_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "SuccessionPlan_status_idx" ON "SuccessionPlan" ("status")`,
  `CREATE INDEX IF NOT EXISTS "SuccessionPlan_nextReviewDate_idx" ON "SuccessionPlan" ("nextReviewDate")`,
  `CREATE TABLE IF NOT EXISTS "SuccessionDistributionInstruction" (
    "id" TEXT NOT NULL,
    "successionPlanId" TEXT NOT NULL,
    "beneficiaryMemberId" TEXT,
    "entityId" TEXT,
    "assetId" TEXT,
    "landParcelId" TEXT,
    "registeredCompanyId" TEXT,
    "rePropertyId" TEXT,
    "vehicleId" TEXT,
    "allocationPct" DECIMAL(5,2),
    "allocationAmount" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'OMR',
    "instructions" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SuccessionDistributionInstruction_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "SuccessionDistributionInstruction_successionPlanId_idx" ON "SuccessionDistributionInstruction" ("successionPlanId")`,
  `CREATE TABLE IF NOT EXISTS "SuccessionAppointment" (
    "id" TEXT NOT NULL,
    "successionPlanId" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "role" "SuccessionAppointmentRole" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SuccessionAppointment_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "SuccessionAppointment_successionPlanId_idx" ON "SuccessionAppointment" ("successionPlanId")`,
  `CREATE TABLE IF NOT EXISTS "SuccessionPlanDocument" (
    "id" TEXT NOT NULL,
    "successionPlanId" TEXT NOT NULL,
    "documentType" "SuccessionDocumentType" NOT NULL DEFAULT 'OTHER',
    "status" "SuccessionDocumentStatus" NOT NULL DEFAULT 'MISSING',
    "fileName" TEXT,
    "fileUrl" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "signedDate" TIMESTAMP(3),
    "jurisdiction" TEXT,
    "notes" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SuccessionPlanDocument_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "SuccessionPlanDocument_successionPlanId_documentType_idx" ON "SuccessionPlanDocument" ("successionPlanId", "documentType")`,
  `CREATE TABLE IF NOT EXISTS "SuccessionChecklistItem" (
    "id" TEXT NOT NULL,
    "successionPlanId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SuccessionChecklistItem_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "SuccessionChecklistItem_successionPlanId_idx" ON "SuccessionChecklistItem" ("successionPlanId")`,
];

function isIgnorable(message) {
  return (
    message.includes("already exists") ||
    message.includes("duplicate_object") ||
    message.includes("duplicate_key") ||
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
    if (await tableExists(client, "FamilyMember")) {
      console.log("FamilyMember table already exists — skipping.");
      return;
    }

    for (const statement of FAMILY_SCHEMA_STATEMENTS) {
      try {
        await client.query(statement);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isIgnorable(message)) continue;
        throw error;
      }
    }

    if (!(await tableExists(client, "FamilyMember"))) {
      throw new Error("FamilyMember table still missing after sync.");
    }

    console.log("Family schema sync complete.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Family schema sync failed:", error);
  process.exit(1);
});
