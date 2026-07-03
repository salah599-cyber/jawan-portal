/**
 * Idempotently applies calendar / tasks tables to an existing production database.
 */
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const { Client } = require("pg");

const CALENDAR_SCHEMA_STATEMENTS = [
  `ALTER TYPE "ModuleName" ADD VALUE IF NOT EXISTS 'CALENDAR'`,
  `CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')`,
  `CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT')`,
  `CREATE TABLE IF NOT EXISTS "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "entityId" TEXT,
    "assigneeId" TEXT,
    "createdById" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "completionNotes" TEXT,
    "reminderDays" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "Task_dueDate_status_idx" ON "Task" ("dueDate", "status")`,
  `CREATE INDEX IF NOT EXISTS "Task_assigneeId_status_idx" ON "Task" ("assigneeId", "status")`,
  `CREATE INDEX IF NOT EXISTS "Task_entityId_idx" ON "Task" ("entityId")`,
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
    console.log("No database URL set; skipping calendar schema sync.");
    return;
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    if (await tableExists(client, "Task")) {
      console.log("Calendar schema already present; nothing to do.");
      return;
    }

    for (const statement of CALENDAR_SCHEMA_STATEMENTS) {
      try {
        await client.query(statement);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isIgnorableSchemaError(message)) continue;
        throw error;
      }
    }

    if (!(await tableExists(client, "Task"))) {
      throw new Error("Calendar schema sync finished but Task table is still missing.");
    }

    console.log("Calendar schema applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Calendar schema sync failed:", error);
  process.exit(1);
});
