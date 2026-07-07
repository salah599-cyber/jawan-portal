import { Client } from "pg";
import {
  PENDING_INVITE_TABLE_CHECK_SQL,
  USERS_SCHEMA_STATEMENTS,
} from "@/lib/db/users-schema-statements";

let ensurePromise: Promise<void> | null = null;

function getDatabaseUrl() {
  return (
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL
  );
}

async function pendingInviteTableExists(client: Client): Promise<boolean> {
  const result = await client.query(PENDING_INVITE_TABLE_CHECK_SQL);
  return Boolean(result.rows[0]?.exists);
}

async function applyUsersSchema() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("No database URL is configured for users schema sync.");
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    if (!(await pendingInviteTableExists(client))) {
      for (const statement of USERS_SCHEMA_STATEMENTS) {
        await client.query(statement);
      }

      if (!(await pendingInviteTableExists(client))) {
        throw new Error(
          "Users schema sync finished but PendingUserInvite table is still missing.",
        );
      }
    }
  } finally {
    await client.end();
  }
}

export function ensureUsersSchema() {
  if (!ensurePromise) {
    ensurePromise = applyUsersSchema().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  return ensurePromise;
}
