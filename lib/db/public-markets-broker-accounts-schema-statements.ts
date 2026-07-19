export const PUBLIC_BROKER_ACCOUNTS_SCHEMA_COLUMN_CHECK_SQL = `
  SELECT EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'PublicEquityHolding'
      AND a.attname = 'brokerAccountId'
      AND a.attnum > 0
      AND NOT a.attisdropped
  ) AS "exists"
`;

export const PUBLIC_BROKER_ACCOUNTS_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "PublicBrokerAccount" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "broker" TEXT NOT NULL,
    "accountNumber" TEXT,
    "label" TEXT,
    "isManaged" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PublicBrokerAccount_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PublicBrokerAccount_entityId_broker_accountNumber_key" ON "PublicBrokerAccount" ("entityId", "broker", "accountNumber")`,
  `CREATE INDEX IF NOT EXISTS "PublicBrokerAccount_entityId_idx" ON "PublicBrokerAccount" ("entityId")`,
  `ALTER TABLE "PublicEquityHolding" ADD COLUMN IF NOT EXISTS "brokerAccountId" TEXT`,
  `ALTER TABLE "PublicEquityHolding" ADD COLUMN IF NOT EXISTS "isManaged" BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE "ImportBatch" ADD COLUMN IF NOT EXISTS "brokerAccountId" TEXT`,
  `ALTER TABLE "ImportBatch" ADD COLUMN IF NOT EXISTS "isManaged" BOOLEAN NOT NULL DEFAULT true`,
  `CREATE INDEX IF NOT EXISTS "PublicEquityHolding_assetId_market_brokerAccountId_isManaged_idx" ON "PublicEquityHolding" ("assetId", "market", "brokerAccountId", "isManaged")`,
];

export const PUBLIC_BROKER_ACCOUNTS_FK_STATEMENTS = [
  `DO $$ BEGIN
    ALTER TABLE "PublicBrokerAccount"
      ADD CONSTRAINT "PublicBrokerAccount_entityId_fkey"
      FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `DO $$ BEGIN
    ALTER TABLE "PublicEquityHolding"
      ADD CONSTRAINT "PublicEquityHolding_brokerAccountId_fkey"
      FOREIGN KEY ("brokerAccountId") REFERENCES "PublicBrokerAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `DO $$ BEGIN
    ALTER TABLE "ImportBatch"
      ADD CONSTRAINT "ImportBatch_brokerAccountId_fkey"
      FOREIGN KEY ("brokerAccountId") REFERENCES "PublicBrokerAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
];
