import "server-only";

import type { UIMessage } from "ai";
import { db } from "@/lib/db";
import { ensureAssistantSchema } from "@/lib/db/ensure-assistant-schema";
import type { Prisma } from "@/lib/generated/prisma/client";

export type AssistantThreadSummary = {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function titleFromMessages(messages: UIMessage[]): string | null {
  const firstUser = messages.find((message) => message.role === "user");
  if (!firstUser) return null;
  const text = firstUser.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join(" ");
  if (!text) return null;
  return text.length > 80 ? `${text.slice(0, 77)}…` : text;
}

export async function listAssistantThreads(userId: string): Promise<AssistantThreadSummary[]> {
  await ensureAssistantSchema();
  return db.assistantThread.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });
}

export async function getAssistantThreadForUser(userId: string, threadId: string) {
  await ensureAssistantSchema();
  return db.assistantThread.findFirst({
    where: { id: threadId, userId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function createAssistantThread(userId: string, title?: string | null) {
  await ensureAssistantSchema();
  return db.assistantThread.create({
    data: {
      userId,
      title: title?.trim() || null,
    },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });
}

export async function deleteAssistantThread(userId: string, threadId: string) {
  await ensureAssistantSchema();
  const existing = await db.assistantThread.findFirst({
    where: { id: threadId, userId },
    select: { id: true },
  });
  if (!existing) return false;
  await db.assistantThread.delete({ where: { id: threadId } });
  return true;
}

export async function renameAssistantThread(userId: string, threadId: string, title: string) {
  await ensureAssistantSchema();
  const existing = await db.assistantThread.findFirst({
    where: { id: threadId, userId },
    select: { id: true },
  });
  if (!existing) return null;
  return db.assistantThread.update({
    where: { id: threadId },
    data: { title: title.trim() || null },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });
}

export function messagesFromThreadRows(
  rows: { messageId: string; role: string; parts: Prisma.JsonValue }[],
): UIMessage[] {
  return rows.map((row) => ({
    id: row.messageId,
    role: row.role as UIMessage["role"],
    parts: (Array.isArray(row.parts) ? row.parts : []) as UIMessage["parts"],
  }));
}

export async function persistAssistantMessages(options: {
  userId: string;
  threadId: string;
  messages: UIMessage[];
}) {
  await ensureAssistantSchema();
  const thread = await db.assistantThread.findFirst({
    where: { id: options.threadId, userId: options.userId },
    select: { id: true, title: true },
  });
  if (!thread) {
    throw new Error("Assistant thread not found.");
  }

  const title = thread.title ?? titleFromMessages(options.messages);

  await db.$transaction(async (tx) => {
    await tx.assistantMessage.deleteMany({ where: { threadId: options.threadId } });
    if (options.messages.length > 0) {
      await tx.assistantMessage.createMany({
        data: options.messages.map((message) => ({
          threadId: options.threadId,
          messageId: message.id,
          role: message.role,
          parts: message.parts as Prisma.InputJsonValue,
        })),
      });
    }
    await tx.assistantThread.update({
      where: { id: options.threadId },
      data: {
        title,
        updatedAt: new Date(),
      },
    });
  });
}
