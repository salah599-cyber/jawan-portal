import { db } from "@/lib/db";
import {
  PENDING_INVITE_TABLE_CHECK_SQL,
  TOTP_USER_COLUMNS_SQL,
  USERS_SCHEMA_STATEMENTS,
} from "@/lib/db/users-schema-statements";

let ensurePromise: Promise<void> | null = null;

async function pendingInviteTableExists(): Promise<boolean> {
  const result = await db.$queryRawUnsafe<Array<{ exists: boolean }>>(
    PENDING_INVITE_TABLE_CHECK_SQL,
  );
  return Boolean(result[0]?.exists);
}

async function applyUsersSchema() {
  if (!(await pendingInviteTableExists())) {
    for (const statement of USERS_SCHEMA_STATEMENTS) {
      await db.$executeRawUnsafe(statement);
    }

    if (!(await pendingInviteTableExists())) {
      throw new Error("Users schema sync finished but PendingUserInvite table is still missing.");
    }
  }

  for (const statement of TOTP_USER_COLUMNS_SQL) {
    await db.$executeRawUnsafe(statement);
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
