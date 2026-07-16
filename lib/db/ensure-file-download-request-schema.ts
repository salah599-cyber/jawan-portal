import "server-only";

import { Client } from "pg";

let ensurePromise: Promise<void> | null = null;

const FILE_DOWNLOAD_REQUEST_SCHEMA_STATEMENTS = [
  `DO $$ BEGIN
    CREATE TYPE "FileDownloadRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DOWNLOADED');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
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

function getDatabaseUrl() {
  return (
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL
  );
}

function isIgnorableSchemaError(message: string) {
  return (
    message.includes("already exists") ||
    message.includes("duplicate_object") ||
    message.includes("duplicate key") ||
    message.includes("IF NOT EXISTS")
  );
}

async function tableExists(client: Client, tableName: string) {
  const result = await client.query(
    `SELECT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = $1
    )`,
    [tableName],
  );
  return Boolean(result.rows[0]?.exists);
}

async function runEnsure() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) return;

  const client = new Client({ connectionString });
  await client.connect();

  try {
    if (await tableExists(client, "FileDownloadRequest")) return;

    for (const statement of FILE_DOWNLOAD_REQUEST_SCHEMA_STATEMENTS) {
      try {
        await client.query(statement);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isIgnorableSchemaError(message)) continue;
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

export async function ensureFileDownloadRequestSchema() {
  if (!ensurePromise) {
    ensurePromise = runEnsure().catch((error) => {
      ensurePromise = null;
      console.error("File download request schema ensure failed:", error);
    });
  }

  await ensurePromise;
}
