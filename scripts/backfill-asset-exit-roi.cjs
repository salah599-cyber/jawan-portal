#!/usr/bin/env node
/**
 * One-time backfill: computes AssetExit.realizedGainPct for existing exit
 * records that already have realizedGain and acquisitionCost but predate the
 * ROI column. Safe to re-run — only fills rows where realizedGainPct is null.
 *
 * Usage:
 *   node scripts/backfill-asset-exit-roi.cjs
 */
require("./load-env.cjs");

const { Client } = require("pg");

function getDatabaseUrl() {
  return (
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL
  );
}

async function main() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    console.log("No database URL set; skipping asset exit ROI backfill.");
    return;
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    const result = await client.query(`
      UPDATE "AssetExit"
      SET "realizedGainPct" = ROUND((("realizedGain" / "acquisitionCost") * 100)::numeric, 4)
      WHERE "realizedGainPct" IS NULL
        AND "realizedGain" IS NOT NULL
        AND "acquisitionCost" IS NOT NULL
        AND "acquisitionCost" <> 0
    `);
    console.log(`Backfilled realizedGainPct for ${result.rowCount} asset exit record(s).`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Asset exit ROI backfill failed:", error);
  process.exit(1);
});
