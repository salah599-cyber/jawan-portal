-- ModuleName enum
ALTER TYPE "ModuleName" ADD VALUE IF NOT EXISTS 'PRIVATE_EQUITY';

CREATE TYPE "PeStage" AS ENUM ('IDEA', 'PRE_SEED', 'SEED', 'SERIES_A', 'GROWTH', 'MATURE');

-- CreateEnum
CREATE TYPE "PeCompanyStatus" AS ENUM ('ACTIVE', 'FOLLOW_ON_PENDING', 'WATCHLIST', 'EXITED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "PeInstrument" AS ENUM ('ORDINARY_SHARES', 'PREFERENCE_SHARES', 'CONVERTIBLE_NOTE', 'SAFE', 'WARRANT', 'DIRECT_LOAN', 'OTHER');

-- CreateEnum
CREATE TYPE "PeShareholderType" AS ENUM ('FOUNDER', 'FAMILY_OFFICE', 'ANGEL', 'VC_FUND', 'CORPORATE', 'ESOP_POOL', 'OTHER');

-- CreateEnum
CREATE TYPE "PeDilutionEventType" AS ENUM ('NEW_ROUND', 'ESOP_GRANT', 'WARRANT_EXERCISE', 'CONVERTIBLE_CONVERSION', 'SECONDARY_SALE', 'SPLIT', 'OTHER');

-- CreateEnum
CREATE TYPE "PeValuationMethod" AS ENUM ('LAST_ROUND', 'REVENUE_MULTIPLE', 'DCF', 'BOOK_VALUE', 'WRITE_OFF', 'OTHER');

-- CreateEnum
CREATE TYPE "PeDistributionType" AS ENUM ('DIVIDEND', 'RETURN_OF_CAPITAL', 'EXIT_PROCEEDS', 'INTEREST');

-- CreateEnum
CREATE TYPE "PeExitType" AS ENUM ('TRADE_SALE', 'IPO', 'SECONDARY', 'BUYBACK', 'WRITE_OFF');

-- CreateEnum
CREATE TYPE "PeContactRole" AS ENUM ('FOUNDER', 'CEO', 'CFO', 'BOARD_MEMBER', 'LEAD_INVESTOR', 'LEGAL_COUNSEL', 'OTHER');

-- CreateEnum
CREATE TYPE "PeAntiDilution" AS ENUM ('NONE', 'BROAD_BASED', 'FULL_RATCHET');

-- CreateEnum
CREATE TYPE "PeReportType" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL', 'AD_HOC');

-- CreateEnum
CREATE TYPE "PeDocumentType" AS ENUM ('SHA', 'TERM_SHEET', 'CAP_TABLE_SNAPSHOT', 'BOARD_RESOLUTION', 'FINANCIAL_STATEMENTS', 'IC_MEMO', 'WARRANT_AGREEMENT', 'CONVERTIBLE_NOTE', 'OTHER');

CREATE TABLE "PeCompany" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tradingName" TEXT,
    "country" TEXT,
    "legalEntityType" TEXT,
    "sector" TEXT,
    "stage" "PeStage" NOT NULL DEFAULT 'SEED',
    "status" "PeCompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "riskRating" INTEGER,
    "notes" TEXT,
    "entityId" TEXT NOT NULL,
    "assetId" TEXT,
    "reportingCurrency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeInvestment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "investmentDate" TIMESTAMP(3) NOT NULL,
    "roundName" TEXT,
    "instrument" "PeInstrument" NOT NULL DEFAULT 'ORDINARY_SHARES',
    "amountReporting" DECIMAL(18,2),
    "amountOriginal" DECIMAL(18,2),
    "currencyOriginal" TEXT,
    "sharesAcquired" DECIMAL(18,6),
    "pricePerShare" DECIMAL(18,4),
    "preMoneyValuation" DECIMAL(18,2),
    "postMoneyValuation" DECIMAL(18,2),
    "ownershipPctAtEntry" DECIMAL(5,2),
    "reservedAmount" DECIMAL(18,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeInvestment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeCapTableShareholder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "shareholderName" TEXT NOT NULL,
    "shareholderType" "PeShareholderType" NOT NULL DEFAULT 'OTHER',
    "isOurStake" BOOLEAN NOT NULL DEFAULT false,
    "roundEntered" TEXT,
    "sharesHeld" DECIMAL(18,6),
    "shareClass" TEXT,
    "ownershipPct" DECIMAL(5,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeCapTableShareholder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeCapTableRound" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "roundName" TEXT NOT NULL,
    "roundDate" TIMESTAMP(3),
    "instrument" "PeInstrument" NOT NULL DEFAULT 'ORDINARY_SHARES',
    "preMoneyValuation" DECIMAL(18,2),
    "postMoneyValuation" DECIMAL(18,2),
    "amountRaised" DECIMAL(18,2),
    "newSharesIssued" DECIMAL(18,6),
    "pricePerShare" DECIMAL(18,4),
    "leadInvestor" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeCapTableRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeCapTableDilutionEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "eventType" "PeDilutionEventType" NOT NULL DEFAULT 'OTHER',
    "eventDate" TIMESTAMP(3),
    "sharesIssued" DECIMAL(18,6),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeCapTableDilutionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeValuation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "valuationDate" TIMESTAMP(3) NOT NULL,
    "postMoneyReporting" DECIMAL(18,2),
    "stakeFairValueReporting" DECIMAL(18,2),
    "method" "PeValuationMethod" NOT NULL DEFAULT 'LAST_ROUND',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeValuation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeDistribution" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "distributionDate" TIMESTAMP(3) NOT NULL,
    "amountReporting" DECIMAL(18,2) NOT NULL,
    "distributionType" "PeDistributionType" NOT NULL DEFAULT 'DIVIDEND',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeExit" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "exitDate" TIMESTAMP(3) NOT NULL,
    "exitType" "PeExitType" NOT NULL DEFAULT 'TRADE_SALE',
    "exitProceedsReporting" DECIMAL(18,2),
    "realisedGainLossReporting" DECIMAL(18,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeExit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeContact" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "PeContactRole" NOT NULL DEFAULT 'OTHER',
    "email" TEXT,
    "phone" TEXT,
    "isBoardRep" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeGovernanceRights" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "boardSeat" BOOLEAN NOT NULL DEFAULT false,
    "boardRepName" TEXT,
    "observerRights" BOOLEAN NOT NULL DEFAULT false,
    "informationRights" BOOLEAN NOT NULL DEFAULT false,
    "reportingFrequency" TEXT,
    "proRataRights" BOOLEAN NOT NULL DEFAULT false,
    "dragAlong" BOOLEAN NOT NULL DEFAULT false,
    "tagAlong" BOOLEAN NOT NULL DEFAULT false,
    "antiDilution" "PeAntiDilution" NOT NULL DEFAULT 'NONE',
    "nextRoundTrigger" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeGovernanceRights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeMonitoringReport" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "reportType" "PeReportType" NOT NULL DEFAULT 'QUARTERLY',
    "revenueReporting" DECIMAL(18,2),
    "burnRateReporting" DECIMAL(18,2),
    "runwayMonths" DECIMAL(6,1),
    "customKpis" JSONB,
    "notes" TEXT,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeMonitoringReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeCompanyDocument" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "documentType" "PeDocumentType" NOT NULL DEFAULT 'OTHER',
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "notes" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PeCompanyDocument_pkey" PRIMARY KEY ("id")

CREATE UNIQUE INDEX "PeCompany_assetId_key" ON "PeCompany"("assetId");
CREATE INDEX "PeCompany_entityId_status_idx" ON "PeCompany"("entityId", "status");
CREATE INDEX "PeCompany_entityId_stage_idx" ON "PeCompany"("entityId", "stage");
CREATE INDEX "PeCompany_sector_idx" ON "PeCompany"("sector");
CREATE INDEX "PeInvestment_companyId_investmentDate_idx" ON "PeInvestment"("companyId", "investmentDate");
CREATE INDEX "PeCapTableShareholder_companyId_isOurStake_idx" ON "PeCapTableShareholder"("companyId", "isOurStake");
CREATE INDEX "PeCapTableRound_companyId_roundDate_idx" ON "PeCapTableRound"("companyId", "roundDate");
CREATE INDEX "PeCapTableDilutionEvent_companyId_eventDate_idx" ON "PeCapTableDilutionEvent"("companyId", "eventDate");
CREATE INDEX "PeValuation_companyId_valuationDate_idx" ON "PeValuation"("companyId", "valuationDate");
CREATE INDEX "PeDistribution_companyId_distributionDate_idx" ON "PeDistribution"("companyId", "distributionDate");
CREATE UNIQUE INDEX "PeExit_companyId_key" ON "PeExit"("companyId");
CREATE INDEX "PeContact_companyId_idx" ON "PeContact"("companyId");
CREATE UNIQUE INDEX "PeGovernanceRights_companyId_key" ON "PeGovernanceRights"("companyId");
CREATE INDEX "PeMonitoringReport_companyId_reportDate_idx" ON "PeMonitoringReport"("companyId", "reportDate");
CREATE INDEX "PeCompanyDocument_companyId_documentType_idx" ON "PeCompanyDocument"("companyId", "documentType");

ALTER TABLE "PeCompany" ADD CONSTRAINT "PeCompany_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeCompany" ADD CONSTRAINT "PeCompany_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeInvestment" ADD CONSTRAINT "PeInvestment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "PeCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeCapTableShareholder" ADD CONSTRAINT "PeCapTableShareholder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "PeCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeCapTableRound" ADD CONSTRAINT "PeCapTableRound_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "PeCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeCapTableDilutionEvent" ADD CONSTRAINT "PeCapTableDilutionEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "PeCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeValuation" ADD CONSTRAINT "PeValuation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "PeCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeDistribution" ADD CONSTRAINT "PeDistribution_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "PeCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeExit" ADD CONSTRAINT "PeExit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "PeCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeContact" ADD CONSTRAINT "PeContact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "PeCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeGovernanceRights" ADD CONSTRAINT "PeGovernanceRights_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "PeCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeMonitoringReport" ADD CONSTRAINT "PeMonitoringReport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "PeCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeMonitoringReport" ADD CONSTRAINT "PeMonitoringReport_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "PeCompanyDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeCompanyDocument" ADD CONSTRAINT "PeCompanyDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "PeCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
