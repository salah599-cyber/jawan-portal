/**
 * Idempotently applies FileDownloadRequest tables to an existing production database.
 */
require("./load-env.cjs");

const { Client } = require("pg");

const FILE_DOWNLOAD_REQUEST_SCHEMA_STATEMENTS = [
  `CREATE TYPE "FileDownloadRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DOWNLOADED')`,
  `CREATE TABLE IF NOT EXISTS "FileDownloadRequest" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "FileDownloadRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewComment" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "downloadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FileDownloadRequest_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "FileDownloadRequest_status_createdAt_idx" ON "FileDownloadRequest" ("status", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "FileDownloadRequest_requestedById_kind_fileId_idx" ON "FileDownloadRequest" ("requestedById", "kind", "fileId")`,
  `DO $$ BEGIN
    ALTER TABLE "FileDownloadRequest"
      ADD CONSTRAINT "FileDownloadRequest_requestedById_fkey"
      FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `DO $$ BEGIN
    ALTER TABLE "FileDownloadRequest"
      ADD CONSTRAINT "FileDownloadRequest_reviewedById_fkey"
      FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
];

function isIgnorable(message) {
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
  const connectionString =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL;

  if (!connectionString) {
    console.error("No database URL configured.");
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    if (await tableExists(client, "FileDownloadRequest")) {
      console.log("FileDownloadRequest table already exists — skipping.");
      return;
    }

    for (const statement of FILE_DOWNLOAD_REQUEST_SCHEMA_STATEMENTS) {
      try {
        await client.query(statement);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isIgnorable(message)) continue;
        throw error;
      }
    }

    if (!(await tableExists(client, "FileDownloadRequest"))) {
      throw new Error("FileDownloadRequest table still missing after sync.");
    }

    console.log("File download request schema sync complete.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("File download request schema sync failed:", error);
  process.exit(1);
});
