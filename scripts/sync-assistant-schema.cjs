/**
 * Idempotently applies assistant chat persistence tables.
 */
require("./load-env.cjs");

const { Client } = require("pg");

const ASSISTANT_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "AssistantThread" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssistantThread_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "AssistantThread_userId_updatedAt_idx" ON "AssistantThread" ("userId", "updatedAt")`,
  `DO $$ BEGIN
    ALTER TABLE "AssistantThread"
      ADD CONSTRAINT "AssistantThread_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `CREATE TABLE IF NOT EXISTS "AssistantMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "parts" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssistantMessage_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "AssistantMessage_threadId_messageId_key" ON "AssistantMessage" ("threadId", "messageId")`,
  `CREATE INDEX IF NOT EXISTS "AssistantMessage_threadId_createdAt_idx" ON "AssistantMessage" ("threadId", "createdAt")`,
  `DO $$ BEGIN
    ALTER TABLE "AssistantMessage"
      ADD CONSTRAINT "AssistantMessage_threadId_fkey"
      FOREIGN KEY ("threadId") REFERENCES "AssistantThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
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
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    console.log("No database URL set; skipping assistant schema sync.");
    return;
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    if (
      (await tableExists(client, "AssistantThread")) &&
      (await tableExists(client, "AssistantMessage"))
    ) {
      console.log("Assistant schema already present; nothing to do.");
      return;
    }

    for (const statement of ASSISTANT_SCHEMA_STATEMENTS) {
      try {
        await client.query(statement);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isIgnorable(message)) continue;
        throw error;
      }
    }

    if (!(await tableExists(client, "AssistantThread"))) {
      throw new Error("Assistant schema sync finished but AssistantThread is still missing.");
    }

    console.log("Assistant schema applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Assistant schema sync failed:", error);
  process.exit(1);
});
