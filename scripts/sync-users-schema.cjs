#!/usr/bin/env node
/**
 * Idempotently ensures PendingUserInvite exists for user management.
 *
 * Usage:
 *   node scripts/sync-users-schema.cjs
 */
require("./load-env.cjs");

const { Client } = require("pg");

const PENDING_INVITE_TABLE_CHECK_SQL = `
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'PendingUserInvite'
  ) AS "exists"
`;

const USERS_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "PendingUserInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'EXTERNAL',
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "entityIds" JSONB NOT NULL DEFAULT '[]',
    "moduleOverrides" JSONB NOT NULL DEFAULT '{}',
    "documentCategories" JSONB NOT NULL DEFAULT '[]',
    "clerkInvitationId" TEXT,
    "invitedById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PendingUserInvite_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PendingUserInvite_email_key" ON "PendingUserInvite"("email")`,
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

async function tableExists(client) {
  const result = await client.query(PENDING_INVITE_TABLE_CHECK_SQL);
  return Boolean(result.rows[0]?.exists);
}

async function main() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    console.log("No database URL set; skipping users schema sync.");
    return;
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    if (await tableExists(client)) {
      console.log("Users schema already present; nothing to do.");
      return;
    }

    for (const statement of USERS_SCHEMA_STATEMENTS) {
      await client.query(statement);
    }

    if (!(await tableExists(client))) {
      throw new Error("Users schema sync finished but PendingUserInvite table is still missing.");
    }

    console.log("Users schema applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Users schema sync failed:", error);
  process.exit(1);
});
