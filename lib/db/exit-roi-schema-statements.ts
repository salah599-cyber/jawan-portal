/**
 * Idempotent column additions that back auto ROI calculation and unified exit
 * analytics: a realized ROI snapshot on AssetExit, an invested-capital snapshot
 * and ROI on PeExit, and sale details on ReProperty (needed to compute a cost
 * basis for real estate sales). PeExit/ReProperty use `ALTER TABLE IF EXISTS`
 * since those modules may not be bootstrapped yet on a fresh database.
 */
export const EXIT_ROI_SCHEMA_STATEMENTS = [
  `ALTER TABLE "AssetExit" ADD COLUMN IF NOT EXISTS "realizedGainPct" DECIMAL(8,4)`,
  `ALTER TABLE IF EXISTS "PeExit" ADD COLUMN IF NOT EXISTS "totalInvestedSnapshot" DECIMAL(18,2)`,
  `ALTER TABLE IF EXISTS "PeExit" ADD COLUMN IF NOT EXISTS "realizedGainPct" DECIMAL(8,4)`,
  `ALTER TABLE IF EXISTS "ReProperty" ADD COLUMN IF NOT EXISTS "soldDate" TIMESTAMP(3)`,
  `ALTER TABLE IF EXISTS "ReProperty" ADD COLUMN IF NOT EXISTS "soldPriceOmr" DECIMAL(18,3)`,
  `ALTER TABLE IF EXISTS "ReProperty" ADD COLUMN IF NOT EXISTS "soldTo" TEXT`,
];

export function isIgnorableExitRoiSchemaError(message: string) {
  return (
    message.includes("already exists") ||
    message.includes("duplicate_object") ||
    message.includes("duplicate key")
  );
}

export const EXIT_ROI_SCHEMA_COLUMN_CHECK_SQL = `
  SELECT EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'AssetExit'
      AND a.attname = 'realizedGainPct'
      AND a.attnum > 0
      AND NOT a.attisdropped
  ) AS "exists"
`;
