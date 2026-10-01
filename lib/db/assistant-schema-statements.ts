export const ASSISTANT_SCHEMA_STATEMENTS = [
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

export function isIgnorableAssistantSchemaError(message: string) {
  return (
    message.includes("already exists") ||
    message.includes("duplicate_object") ||
    message.includes("duplicate key") ||
    message.includes("IF NOT EXISTS")
  );
}
