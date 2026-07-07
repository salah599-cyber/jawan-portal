export const PENDING_INVITE_TABLE_CHECK_SQL = `
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'PendingUserInvite'
  ) AS "exists"
`;

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
