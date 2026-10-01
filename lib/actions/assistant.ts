"use server";

import type { UIMessage } from "ai";
import { revalidatePath } from "next/cache";
import {
  createAssistantThread,
  deleteAssistantThread,
  getAssistantThreadForUser,
  listAssistantThreads,
  messagesFromThreadRows,
  renameAssistantThread,
  type AssistantThreadSummary,
} from "@/lib/assistant/persistence";
import { requireModuleAccess } from "@/lib/permissions/access";

export type { AssistantThreadSummary };

export async function listMyAssistantThreads(): Promise<AssistantThreadSummary[]> {
  const ctx = await requireModuleAccess("DASHBOARD");
  return listAssistantThreads(ctx.id);
}

export async function createMyAssistantThread(title?: string) {
  const ctx = await requireModuleAccess("DASHBOARD");
  const thread = await createAssistantThread(ctx.id, title);
  revalidatePath("/assistant");
  return thread;
}

export async function deleteMyAssistantThread(threadId: string) {
  const ctx = await requireModuleAccess("DASHBOARD");
  const deleted = await deleteAssistantThread(ctx.id, threadId);
  revalidatePath("/assistant");
  return deleted;
}

export async function renameMyAssistantThread(threadId: string, title: string) {
  const ctx = await requireModuleAccess("DASHBOARD");
  const thread = await renameAssistantThread(ctx.id, threadId, title);
  revalidatePath("/assistant");
  return thread;
}

export async function getMyAssistantThreadMessages(threadId: string): Promise<{
  thread: AssistantThreadSummary;
  messages: UIMessage[];
} | null> {
  const ctx = await requireModuleAccess("DASHBOARD");
  const thread = await getAssistantThreadForUser(ctx.id, threadId);
  if (!thread) return null;
  return {
    thread: {
      id: thread.id,
      title: thread.title,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
    },
    messages: messagesFromThreadRows(thread.messages),
  };
}
