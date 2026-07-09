/**
 * Idempotently applies AssetType table and Asset.assetTypeId column.
 */
require("./load-env.cjs");

const { Client } = require("pg");

const statements = [
  `CREATE TABLE IF NOT EXISTS "AssetType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssetType_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "AssetType_name_key" ON "AssetType"("name")`,
  `ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "assetTypeId" TEXT`,
  `CREATE INDEX IF NOT EXISTS "Asset_assetTypeId_idx" ON "Asset"("assetTypeId")`,
];

function getDatabaseUrl() {
  return (
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL
  );
}

function isIgnorableSchemaError(message) {
  return (
    message.includes("already exists") ||
    message.includes("duplicate_object") ||
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
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    console.log("No database URL configured; skipping asset types schema sync.");
    return;
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    if (await tableExists(client, "AssetType")) {
      console.log("AssetType table already exists.");
      return;
    }

    for (const statement of statements) {
      try {
        await client.query(statement);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isIgnorableSchemaError(message)) continue;
        throw error;
      }
    }

    if (!(await tableExists(client, "AssetType"))) {
      throw new Error("Asset types schema sync finished but AssetType table is still missing.");
    }

    console.log("Asset types schema synced successfully.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
