/**
 * Idempotently applies PE/VC tables to an existing production database.
 * Uses pg directly so we never invoke Prisma Migrate (avoids P3005 on Vercel).
 *
 * Run manually:
 *   node scripts/sync-pe-schema.cjs
 */
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

function getDatabaseUrl() {
  return (
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL
  );
}

async function tableExists(client, tableName) {
  const result = await client.query(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    )`,
    [tableName],
  );
  return result.rows[0].exists;
}

async function main() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    console.log("No database URL set; skipping PE schema sync.");
    return;
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    if (await tableExists(client, "PeCompany")) {
      console.log("PE schema already present; nothing to do.");
      return;
    }

    const sqlPath = path.join(__dirname, "pe-schema.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    await client.query(sql);
    console.log("PE schema applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("PE schema sync failed:", error);
  process.exit(1);
});
