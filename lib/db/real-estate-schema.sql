ALTER TYPE "ModuleName" ADD VALUE IF NOT EXISTS 'REAL_ESTATE';

CREATE TYPE "RePropertyType" AS ENUM ('VILLA', 'APARTMENT_BUILDING', 'COMMERCIAL_BUILDING', 'MIXED_USE', 'LAND', 'WAREHOUSE', 'OTHER');
CREATE TYPE "ReOwnershipStatus" AS ENUM ('OWNED', 'JOINTLY_OWNED', 'MORTGAGED');
CREATE TYPE "ReValuationMethod" AS ENUM ('MARKET_APPRAISAL', 'COST', 'INCOME', 'SELF_ASSESSED');
CREATE TYPE "RePropertyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'UNDER_RENOVATION', 'FOR_SALE', 'SOLD');
CREATE TYPE "ReUnitType" AS ENUM ('FLAT', 'APARTMENT', 'OFFICE', 'SHOWROOM', 'SHOP', 'WAREHOUSE', 'VILLA', 'STUDIO', 'PENTHOUSE', 'PARKING', 'STORAGE', 'OTHER');
CREATE TYPE "ReOccupancyStatus" AS ENUM ('RENTED', 'VACANT', 'OWNER_OCCUPIED', 'UNDER_RENOVATION', 'RESERVED');
CREATE TYPE "ReFurnishingStatus" AS ENUM ('FURNISHED', 'SEMI_FURNISHED', 'UNFURNISHED');
CREATE TYPE "ReTenantIdType" AS ENUM ('OMANI_ID', 'PASSPORT', 'RESIDENCE_CARD');
CREATE TYPE "ReLeaseStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'TERMINATED', 'PENDING', 'RENEWED');
CREATE TYPE "RePaymentFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL');
CREATE TYPE "RePaymentMethod" AS ENUM ('BANK_TRANSFER', 'CHEQUE', 'CASH', 'PDC');
CREATE TYPE "ReRentPaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'PARTIALLY_PAID', 'WAIVED');
CREATE TYPE "RePdcStatus" AS ENUM ('PENDING', 'CLEARED', 'BOUNCED', 'REPLACED');
CREATE TYPE "ReMaintenanceReportedBy" AS ENUM ('TENANT', 'OWNER', 'PROPERTY_MANAGER', 'INSPECTION');
CREATE TYPE "ReMaintenanceCategory" AS ENUM ('PLUMBING', 'ELECTRICAL', 'AC_HVAC', 'PAINTING', 'FLOORING', 'STRUCTURE', 'PEST_CONTROL', 'CLEANING', 'APPLIANCE', 'DOOR_WINDOW', 'ELEVATOR', 'COMMON_AREA', 'OTHER');
CREATE TYPE "ReMaintenancePriority" AS ENUM ('URGENT', 'HIGH', 'MEDIUM', 'LOW');
CREATE TYPE "ReMaintenanceStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'PENDING_PARTS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ReMaintenanceChargedTo" AS ENUM ('OWNER', 'TENANT');
CREATE TYPE "ReUtilityType" AS ENUM ('ELECTRICITY', 'WATER');
CREATE TYPE "ReUtilityPaymentStatus" AS ENUM ('PAID', 'UNPAID', 'TENANT_RESPONSIBLE');
CREATE TYPE "RePropertyExpenseCategory" AS ENUM ('MAINTENANCE', 'INSURANCE', 'MUNICIPALITY_FEE', 'SERVICE_CHARGE', 'MANAGEMENT_FEE', 'LEGAL', 'MORTGAGE', 'RENOVATION', 'LANDSCAPING', 'SECURITY', 'CLEANING', 'UTILITY', 'OTHER');
CREATE TYPE "ReExpensePaymentStatus" AS ENUM ('PAID', 'UNPAID', 'OVERDUE');
CREATE TYPE "ReRecurrenceFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL');
CREATE TYPE "RePropertyDocumentType" AS ENUM ('TITLE_DEED', 'LEASE_CONTRACT', 'NOC', 'MUNICIPALITY_CERTIFICATE', 'INSURANCE_POLICY', 'MORTGAGE_DOCUMENT', 'VALUATION_REPORT', 'MAINTENANCE_INVOICE', 'UTILITY_BILL', 'TENANT_ID', 'FLOOR_PLAN', 'PHOTO', 'OTHER');

CREATE TABLE "ReProperty" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "propertyType" "RePropertyType" NOT NULL,
    "ownershipStatus" "ReOwnershipStatus" NOT NULL DEFAULT 'OWNED',
    "entityId" TEXT NOT NULL,
    "assetId" TEXT,
    "landParcelId" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "purchasePriceOmr" DECIMAL(18,3),
    "currentValuationOmr" DECIMAL(18,3),
    "lastValuationDate" TIMESTAMP(3),
    "valuationMethod" "ReValuationMethod",
    "governorate" TEXT,
    "wilayat" TEXT,
    "area" TEXT,
    "streetAddress" TEXT,
    "plotNumber" TEXT,
    "parcelNumber" TEXT,
    "gpsLat" DECIMAL(10,7),
    "gpsLng" DECIMAL(10,7),
    "googleMapsUrl" TEXT,
    "landAreaSqm" DECIMAL(18,2),
    "builtUpAreaSqm" DECIMAL(18,2),
    "numFloors" INTEGER,
    "numUnits" INTEGER NOT NULL DEFAULT 0,
    "yearBuilt" INTEGER,
    "mortgageBank" TEXT,
    "mortgageOutstandingOmr" DECIMAL(18,3),
    "mortgageMonthlyPaymentOmr" DECIMAL(18,3),
    "mortgageEndDate" TIMESTAMP(3),
    "status" "RePropertyStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReProperty_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReProperty_assetId_key" ON "ReProperty"("assetId");
CREATE UNIQUE INDEX "ReProperty_landParcelId_key" ON "ReProperty"("landParcelId");
CREATE INDEX "ReProperty_entityId_status_idx" ON "ReProperty"("entityId", "status");
CREATE INDEX "ReProperty_entityId_governorate_wilayat_idx" ON "ReProperty"("entityId", "governorate", "wilayat");

CREATE TABLE "ReUnit" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "unitType" "ReUnitType" NOT NULL,
    "floorNumber" INTEGER,
    "areaSqm" DECIMAL(18,2),
    "numBedrooms" INTEGER,
    "numBathrooms" INTEGER,
    "numParkingSpaces" INTEGER,
    "electricityMeterNumber" TEXT,
    "electricityAccountNumber" TEXT,
    "electricityProvider" TEXT,
    "waterMeterNumber" TEXT,
    "waterAccountNumber" TEXT,
    "waterProvider" TEXT DEFAULT 'PAEW',
    "occupancyStatus" "ReOccupancyStatus" NOT NULL DEFAULT 'VACANT',
    "furnishingStatus" "ReFurnishingStatus",
    "marketRentOmr" DECIMAL(18,3),
    "vacantSince" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReUnit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReUnit_propertyId_occupancyStatus_idx" ON "ReUnit"("propertyId", "occupancyStatus");
CREATE INDEX "ReUnit_propertyId_unitType_idx" ON "ReUnit"("propertyId", "unitType");

CREATE TABLE "ReTenant" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "nationality" TEXT,
    "idType" "ReTenantIdType",
    "idNumber" TEXT,
    "idExpiryDate" TIMESTAMP(3),
    "phonePrimary" TEXT,
    "phoneSecondary" TEXT,
    "email" TEXT,
    "employerName" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReTenant_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReTenant_unitId_idx" ON "ReTenant"("unitId");
CREATE INDEX "ReTenant_fullName_idx" ON "ReTenant"("fullName");

CREATE TABLE "ReLease" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leaseStartDate" TIMESTAMP(3) NOT NULL,
    "leaseEndDate" TIMESTAMP(3) NOT NULL,
    "leaseDurationMonths" INTEGER,
    "noticePeriodDays" INTEGER NOT NULL DEFAULT 90,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "rentAmountOmr" DECIMAL(18,3) NOT NULL,
    "paymentFrequency" "RePaymentFrequency" NOT NULL DEFAULT 'MONTHLY',
    "paymentMethod" "RePaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "securityDepositOmr" DECIMAL(18,3),
    "securityDepositPaid" BOOLEAN NOT NULL DEFAULT false,
    "securityDepositReturned" BOOLEAN NOT NULL DEFAULT false,
    "securityDepositReturnDate" TIMESTAMP(3),
    "securityDepositDeductionsOmr" DECIMAL(18,3),
    "pdcBank" TEXT,
    "pdcChequeNumbers" JSONB,
    "municipalityRegistrationNumber" TEXT,
    "municipalityRegistrationDate" TIMESTAMP(3),
    "municipalityExpiryDate" TIMESTAMP(3),
    "legalReference" TEXT,
    "status" "ReLeaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "terminationDate" TIMESTAMP(3),
    "terminationReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReLease_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReLease_unitId_status_idx" ON "ReLease"("unitId", "status");
CREATE INDEX "ReLease_tenantId_idx" ON "ReLease"("tenantId");
CREATE INDEX "ReLease_leaseEndDate_idx" ON "ReLease"("leaseEndDate");

CREATE TABLE "ReRentSchedule" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amountOmr" DECIMAL(18,3) NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "paymentStatus" "ReRentPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidDate" TIMESTAMP(3),
    "paidAmountOmr" DECIMAL(18,3),
    "paymentMethod" "RePaymentMethod",
    "chequeNumber" TEXT,
    "bankReference" TEXT,
    "receiptNumber" TEXT,
    "pdcChequeNumber" TEXT,
    "pdcBank" TEXT,
    "pdcClearanceDate" TIMESTAMP(3),
    "pdcStatus" "RePdcStatus",
    "lateFeeOmr" DECIMAL(18,3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReRentSchedule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReRentSchedule_leaseId_dueDate_idx" ON "ReRentSchedule"("leaseId", "dueDate");
CREATE INDEX "ReRentSchedule_unitId_paymentStatus_idx" ON "ReRentSchedule"("unitId", "paymentStatus");
CREATE INDEX "ReRentSchedule_dueDate_paymentStatus_idx" ON "ReRentSchedule"("dueDate", "paymentStatus");

CREATE TABLE "ReMaintenanceRequest" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitId" TEXT,
    "reportedBy" "ReMaintenanceReportedBy" NOT NULL,
    "reportedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" "ReMaintenanceCategory" NOT NULL,
    "priority" "ReMaintenancePriority" NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT NOT NULL,
    "assignedTo" TEXT,
    "contractorCompany" TEXT,
    "contractorPhone" TEXT,
    "status" "ReMaintenanceStatus" NOT NULL DEFAULT 'OPEN',
    "scheduledDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "quotedCostOmr" DECIMAL(18,3),
    "actualCostOmr" DECIMAL(18,3),
    "invoiceNumber" TEXT,
    "chargedTo" "ReMaintenanceChargedTo",
    "paidByOwner" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReMaintenanceRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReMaintenanceRequest_propertyId_status_idx" ON "ReMaintenanceRequest"("propertyId", "status");
CREATE INDEX "ReMaintenanceRequest_unitId_status_idx" ON "ReMaintenanceRequest"("unitId", "status");

CREATE TABLE "ReUtilityReading" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "utilityType" "ReUtilityType" NOT NULL,
    "readingDate" TIMESTAMP(3) NOT NULL,
    "meterReading" DECIMAL(18,3) NOT NULL,
    "previousReading" DECIMAL(18,3),
    "unitsConsumed" DECIMAL(18,3),
    "amountOmr" DECIMAL(18,3),
    "billReference" TEXT,
    "paymentStatus" "ReUtilityPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReUtilityReading_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReUtilityReading_unitId_utilityType_readingDate_idx" ON "ReUtilityReading"("unitId", "utilityType", "readingDate");

CREATE TABLE "RePropertyValuation" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "valuationDate" TIMESTAMP(3) NOT NULL,
    "valuationOmr" DECIMAL(18,3) NOT NULL,
    "method" "ReValuationMethod",
    "appraiserName" TEXT,
    "appraiserCompany" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RePropertyValuation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RePropertyValuation_propertyId_valuationDate_idx" ON "RePropertyValuation"("propertyId", "valuationDate");

CREATE TABLE "RePropertyExpense" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitId" TEXT,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "category" "RePropertyExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amountOmr" DECIMAL(18,3) NOT NULL,
    "vendorName" TEXT,
    "invoiceNumber" TEXT,
    "paymentStatus" "ReExpensePaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paymentDate" TIMESTAMP(3),
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceFrequency" "ReRecurrenceFrequency",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RePropertyExpense_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RePropertyExpense_propertyId_expenseDate_idx" ON "RePropertyExpense"("propertyId", "expenseDate");
CREATE INDEX "RePropertyExpense_propertyId_category_idx" ON "RePropertyExpense"("propertyId", "category");

CREATE TABLE "RePropertyDocument" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitId" TEXT,
    "leaseId" TEXT,
    "maintenanceRequestId" TEXT,
    "documentType" "RePropertyDocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "notes" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RePropertyDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RePropertyDocument_propertyId_documentType_idx" ON "RePropertyDocument"("propertyId", "documentType");
CREATE INDEX "RePropertyDocument_unitId_idx" ON "RePropertyDocument"("unitId");
CREATE INDEX "RePropertyDocument_leaseId_idx" ON "RePropertyDocument"("leaseId");

ALTER TABLE "ReProperty" ADD CONSTRAINT "ReProperty_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReProperty" ADD CONSTRAINT "ReProperty_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReProperty" ADD CONSTRAINT "ReProperty_landParcelId_fkey" FOREIGN KEY ("landParcelId") REFERENCES "LandParcel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReUnit" ADD CONSTRAINT "ReUnit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ReProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReTenant" ADD CONSTRAINT "ReTenant_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ReUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReLease" ADD CONSTRAINT "ReLease_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ReUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReLease" ADD CONSTRAINT "ReLease_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "ReTenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReRentSchedule" ADD CONSTRAINT "ReRentSchedule_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "ReLease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReRentSchedule" ADD CONSTRAINT "ReRentSchedule_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ReUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReMaintenanceRequest" ADD CONSTRAINT "ReMaintenanceRequest_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ReProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReMaintenanceRequest" ADD CONSTRAINT "ReMaintenanceRequest_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ReUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReUtilityReading" ADD CONSTRAINT "ReUtilityReading_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ReUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RePropertyValuation" ADD CONSTRAINT "RePropertyValuation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ReProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RePropertyExpense" ADD CONSTRAINT "RePropertyExpense_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ReProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RePropertyExpense" ADD CONSTRAINT "RePropertyExpense_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ReUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RePropertyDocument" ADD CONSTRAINT "RePropertyDocument_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ReProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RePropertyDocument" ADD CONSTRAINT "RePropertyDocument_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ReUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RePropertyDocument" ADD CONSTRAINT "RePropertyDocument_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "ReLease"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RePropertyDocument" ADD CONSTRAINT "RePropertyDocument_maintenanceRequestId_fkey" FOREIGN KEY ("maintenanceRequestId") REFERENCES "ReMaintenanceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
