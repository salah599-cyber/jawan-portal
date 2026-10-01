import type { UIMessage } from "ai";
import { PlatformHeader } from "@/components/platform/platform-header";
import { AssistantChat } from "@/components/assistant/assistant-chat";
import {
  createAssistantThread,
  listAssistantThreads,
  getAssistantThreadForUser,
  messagesFromThreadRows,
} from "@/lib/assistant/persistence";
import { requireModuleAccess } from "@/lib/permissions/access";

export default async function AssistantPage() {
  const ctx = await requireModuleAccess("DASHBOARD");
  let threads = await listAssistantThreads(ctx.id);
  if (threads.length === 0) {
    const created = await createAssistantThread(ctx.id);
    threads = [created];
  }

  const activeThreadId = threads[0]!.id;
  const thread = await getAssistantThreadForUser(ctx.id, activeThreadId);
  const initialMessages: UIMessage[] = thread
    ? messagesFromThreadRows(thread.messages)
    : [];

  return (
    <>
      <PlatformHeader title="Assistant" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <AssistantChat
          initialThreads={threads}
          initialThreadId={activeThreadId}
          initialMessages={initialMessages}
        />
      </main>
    </>
  );
}
