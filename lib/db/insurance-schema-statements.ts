export const INSURANCE_SCHEMA_STATEMENTS = [
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

export function isIgnorableInsuranceSchemaError(message: string) {
  return (
    message.includes("already exists") ||
    message.includes("duplicate_object") ||
    message.includes("duplicate key") ||
    message.includes("IF NOT EXISTS")
  );
}
