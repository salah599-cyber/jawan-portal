export const PUBLIC_INSTRUMENTS_SCHEMA_COLUMN_CHECK_SQL = `
  SELECT EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'PublicEquityHolding'
      AND a.attname = 'instrumentType'
      AND a.attnum > 0
      AND NOT a.attisdropped
  ) AS "exists"
`;

export const PUBLIC_INSTRUMENTS_SCHEMA_STATEMENTS = [
  `CREATE TYPE "PublicInstrumentType" AS ENUM ('EQUITY', 'OPTION', 'STRUCTURED_NOTE')`,
  `CREATE TYPE "PublicOptionType" AS ENUM ('CALL', 'PUT')`,
  `ALTER TABLE "PublicEquityHolding" ADD COLUMN IF NOT EXISTS "instrumentType" "PublicInstrumentType" NOT NULL DEFAULT 'EQUITY'`,
  `CREATE INDEX IF NOT EXISTS "PublicEquityHolding_instrumentType_idx" ON "PublicEquityHolding" ("instrumentType")`,
  `CREATE TABLE IF NOT EXISTS "PublicOptionDetail" (
    "id" TEXT NOT NULL,
    "holdingId" TEXT NOT NULL,
    "underlyingSymbol" TEXT NOT NULL,
    "optionType" "PublicOptionType" NOT NULL,
    "strikePrice" DECIMAL(18,4) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "contractMultiplier" INTEGER NOT NULL DEFAULT 100,
    "premiumPaid" DECIMAL(18,2),
    CONSTRAINT "PublicOptionDetail_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PublicOptionDetail_holdingId_key" ON "PublicOptionDetail"("holdingId")`,
  `CREATE TABLE IF NOT EXISTS "PublicStructuredNoteDetail" (
    "id" TEXT NOT NULL,
    "holdingId" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "notionalAmount" DECIMAL(18,2) NOT NULL,
    "issueDate" TIMESTAMP(3),
    "maturityDate" TIMESTAMP(3) NOT NULL,
    "couponRate" DECIMAL(8,4),
    "barrierLevel" DECIMAL(8,4),
    "payoffNotes" TEXT,
    CONSTRAINT "PublicStructuredNoteDetail_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PublicStructuredNoteDetail_holdingId_key" ON "PublicStructuredNoteDetail"("holdingId")`,
];

export const PUBLIC_INSTRUMENTS_ENUM_EXPANSION_STATEMENTS = [
  `ALTER TYPE "PublicInstrumentType" ADD VALUE IF NOT EXISTS 'CRYPTO'`,
  `ALTER TYPE "PublicInstrumentType" ADD VALUE IF NOT EXISTS 'BOND'`,
];

export const PUBLIC_BOND_DETAIL_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "PublicBondDetail" (
    "id" TEXT NOT NULL,
    "holdingId" TEXT NOT NULL,
    "bondName" TEXT NOT NULL,
    "faceValue" DECIMAL(18,2) NOT NULL,
    "pricePercent" DECIMAL(8,4),
    CONSTRAINT "PublicBondDetail_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PublicBondDetail_holdingId_key" ON "PublicBondDetail"("holdingId")`,
];

export const PUBLIC_CRYPTO_DETAIL_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "PublicCryptoDetail" (
    "id" TEXT NOT NULL,
    "holdingId" TEXT NOT NULL,
    "coinGeckoId" TEXT NOT NULL,
    "custodian" TEXT,
    CONSTRAINT "PublicCryptoDetail_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PublicCryptoDetail_holdingId_key" ON "PublicCryptoDetail"("holdingId")`,
];
