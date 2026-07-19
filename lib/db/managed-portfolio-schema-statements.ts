export const MANAGED_PORTFOLIO_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "ManagedPortfolio" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "managerName" TEXT NOT NULL,
    "accountNumber" TEXT,
    "notes" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ManagedPortfolio_pkey" PRIMARY KEY ("id")
  )`,
  `ALTER TABLE "ManagedPortfolio" ADD COLUMN IF NOT EXISTS "entityId" TEXT`,
  `ALTER TABLE "ManagedPortfolio" ADD COLUMN IF NOT EXISTS "name" TEXT`,
  `ALTER TABLE "ManagedPortfolio" ADD COLUMN IF NOT EXISTS "managerName" TEXT`,
  `ALTER TABLE "ManagedPortfolio" ADD COLUMN IF NOT EXISTS "accountNumber" TEXT`,
  `ALTER TABLE "ManagedPortfolio" ADD COLUMN IF NOT EXISTS "notes" TEXT`,
  `ALTER TABLE "ManagedPortfolio" ADD COLUMN IF NOT EXISTS "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE'`,
  `ALTER TABLE "ManagedPortfolio" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
  `ALTER TABLE "ManagedPortfolio" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
  `CREATE INDEX IF NOT EXISTS "ManagedPortfolio_entityId_idx" ON "ManagedPortfolio" ("entityId")`,
  `CREATE INDEX IF NOT EXISTS "ManagedPortfolio_entityId_status_idx" ON "ManagedPortfolio" ("entityId", "status")`,
  `DO $$ BEGIN
    ALTER TABLE "ManagedPortfolio"
      ADD CONSTRAINT "ManagedPortfolio_entityId_fkey"
      FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$`,
  `ALTER TABLE "PublicEquityHolding" ADD COLUMN IF NOT EXISTS "managedPortfolioId" TEXT`,
  `CREATE INDEX IF NOT EXISTS "PublicEquityHolding_managedPortfolioId_market_idx" ON "PublicEquityHolding" ("managedPortfolioId", "market")`,
  `DO $$ BEGIN
    ALTER TABLE "PublicEquityHolding"
      ADD CONSTRAINT "PublicEquityHolding_managedPortfolioId_fkey"
      FOREIGN KEY ("managedPortfolioId") REFERENCES "ManagedPortfolio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$`,
  `ALTER TABLE "ImportBatch" ADD COLUMN IF NOT EXISTS "managedPortfolioId" TEXT`,
  `DO $$ BEGIN
    ALTER TABLE "ImportBatch"
      ADD CONSTRAINT "ImportBatch_managedPortfolioId_fkey"
      FOREIGN KEY ("managedPortfolioId") REFERENCES "ManagedPortfolio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$`,
  `CREATE TABLE IF NOT EXISTS "ManagedPortfolioValuation" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "managedPortfolioId" TEXT,
    "valueOmr" DECIMAL(18,2) NOT NULL,
    "costBasisOmr" DECIMAL(18,2),
    "valuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ManagedPortfolioValuation_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "ManagedPortfolioValuation_entityId_managedPortfolioId_valuedAt_idx" ON "ManagedPortfolioValuation" ("entityId", "managedPortfolioId", "valuedAt")`,
  `DO $$ BEGIN
    ALTER TABLE "ManagedPortfolioValuation"
      ADD CONSTRAINT "ManagedPortfolioValuation_entityId_fkey"
      FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$`,
  `DO $$ BEGIN
    ALTER TABLE "ManagedPortfolioValuation"
      ADD CONSTRAINT "ManagedPortfolioValuation_managedPortfolioId_fkey"
      FOREIGN KEY ("managedPortfolioId") REFERENCES "ManagedPortfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$`,
];

export const MANAGED_PORTFOLIO_SCHEMA_COLUMN_CHECK_SQL = `
  SELECT EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'PublicEquityHolding'
      AND a.attname = 'managedPortfolioId'
      AND a.attnum > 0
      AND NOT a.attisdropped
  ) AS "exists"
`;
