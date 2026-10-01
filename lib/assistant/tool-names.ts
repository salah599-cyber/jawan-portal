import { getToolName, isToolUIPart, type UIMessage } from "ai";

export function extractAssistantToolNames(messages: UIMessage[]): string[] {
  const names = new Set<string>();

  for (const message of messages) {
    if (message.role !== "assistant") continue;
    for (const part of message.parts) {
      if (!isToolUIPart(part)) continue;
      names.add(getToolName(part));
    }
  }

  return [...names].sort();
}
