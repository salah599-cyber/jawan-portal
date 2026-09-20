export const PENDING_INVITE_TABLE_CHECK_SQL = `
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'PendingUserInvite'
  ) AS "exists"
`;

export const TOTP_USER_COLUMNS_SQL = [
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpEnabled" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpSecretEncrypted" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpPendingSecretEncrypted" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpBackupCodeHashes" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpFailedAttempts" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpLockedUntil" TIMESTAMP(3)`,
];

export const USERS_SCHEMA_STATEMENTS = [
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
