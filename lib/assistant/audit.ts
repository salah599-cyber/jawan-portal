import type { UIMessage } from "ai";
import { logAudit } from "@/lib/audit/log";
import { extractAssistantToolNames } from "@/lib/assistant/tool-names";

export { extractAssistantToolNames };

export async function logAssistantChatTurn(input: {
  userId: string;
  threadId: string;
  messages: UIMessage[];
  model: string;
  durationMs: number;
  isAborted?: boolean;
  finishReason?: string;
  error?: string;
}) {
  const toolNames = extractAssistantToolNames(input.messages);
  const assistantMessages = input.messages.filter((message) => message.role === "assistant");
  const userMessages = input.messages.filter((message) => message.role === "user");

  await logAudit({
    userId: input.userId,
    action: "ASSISTANT_CHAT",
    resource: "AssistantThread",
    resourceId: input.threadId,
    metadata: {
      model: input.model,
      durationMs: input.durationMs,
      messageCount: input.messages.length,
      userMessageCount: userMessages.length,
      assistantMessageCount: assistantMessages.length,
      toolNames,
      toolCallCount: toolNames.length,
      isAborted: Boolean(input.isAborted),
      finishReason: input.finishReason ?? null,
      error: input.error ?? null,
    },
  });
}
