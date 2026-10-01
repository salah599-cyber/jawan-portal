"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Bot, Loader2, Plus, Send, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AssistantMessage } from "@/components/assistant/assistant-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  createMyAssistantThread,
  deleteMyAssistantThread,
  getMyAssistantThreadMessages,
  type AssistantThreadSummary,
} from "@/lib/actions/assistant";
import { cn } from "@/lib/utils";

const SUGGESTED_PROMPTS = [
  "What's my debt-to-equity ratio?",
  "Show my asset allocation",
  "How has net worth changed this year?",
  "What liabilities are coming due soon?",
  "Summarize my cash position",
  "What's my PE portfolio MOIC?",
  "Which documents expire soon?",
  "List pending investment proposals",
];

type AssistantChatProps = {
  initialThreads: AssistantThreadSummary[];
  initialThreadId: string;
  initialMessages: UIMessage[];
};

function formatThreadLabel(thread: AssistantThreadSummary) {
  if (thread.title?.trim()) return thread.title.trim();
  return "New chat";
}

function AssistantChatPane({
  threadId,
  initialMessages,
  onThreadUpdated,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  onThreadUpdated: (thread: AssistantThreadSummary) => void;
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/assistant/chat",
        prepareSendMessagesRequest: ({ messages, body, id, trigger, messageId }) => ({
          body: {
            ...body,
            id,
            messages,
            trigger,
            messageId,
            threadId,
          },
        }),
      }),
    [threadId],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
  });

  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (status !== "ready" || messages.length === 0) return;
    void getMyAssistantThreadMessages(threadId).then((loaded) => {
      if (loaded) onThreadUpdated(loaded.thread);
    });
  }, [status, messages.length, threadId, onThreadUpdated]);

  function submitMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    submitMessage(input);
  }

  return (
    <Card className="flex min-h-[70vh] flex-1 flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bot className="size-5" />
          </div>
          <div>
            <CardTitle>Financial Assistant</CardTitle>
            <CardDescription>
              Ask about portfolio, cash, PE/LP, real estate, lands, cheques, proposals, documents, and
              more.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 p-0">
        <ScrollArea className="flex-1 px-4 py-4">
          <div className="flex min-h-[48vh] flex-col gap-4">
            {messages.length === 0 ? (
              <div className="space-y-4 py-6">
                <p className="text-sm text-muted-foreground">
                  Try one of these questions to get started:
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <Button
                      key={prompt}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-auto whitespace-normal text-left"
                      onClick={() => submitMessage(prompt)}
                      disabled={isBusy}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => <AssistantMessage key={message.id} message={message} />)
            )}

            {isBusy ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Analyzing your portfolio…
              </div>
            ) : null}

            {error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error.message || "Something went wrong. Try again in a moment."}
              </p>
            ) : null}

            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <form onSubmit={handleSubmit} className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about your portfolio…"
              rows={2}
              disabled={isBusy}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submitMessage(input);
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={isBusy || !input.trim()}
              aria-label="Send message"
            >
              <Send className="size-4" />
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Answers are based on live platform data with source links. Not tax or investment advice.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export function AssistantChat({
  initialThreads,
  initialThreadId,
  initialMessages,
}: AssistantChatProps) {
  const [threads, setThreads] = useState(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState(initialThreadId);
  const [activeMessages, setActiveMessages] = useState(initialMessages);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleThreadUpdated(thread: AssistantThreadSummary) {
    setThreads((prev) => {
      const next = prev.filter((item) => item.id !== thread.id);
      return [thread, ...next].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    });
  }

  function selectThread(threadId: string) {
    if (threadId === activeThreadId || isPending) return;
    setLoadError(null);
    startTransition(async () => {
      const loaded = await getMyAssistantThreadMessages(threadId);
      if (!loaded) {
        setLoadError("Could not load that conversation.");
        return;
      }
      setActiveThreadId(loaded.thread.id);
      setActiveMessages(loaded.messages);
    });
  }

  function handleNewChat() {
    if (isPending) return;
    setLoadError(null);
    startTransition(async () => {
      const thread = await createMyAssistantThread();
      setThreads((prev) => [thread, ...prev.filter((item) => item.id !== thread.id)]);
      setActiveThreadId(thread.id);
      setActiveMessages([]);
    });
  }

  function handleDeleteThread(threadId: string) {
    if (isPending) return;
    setLoadError(null);
    startTransition(async () => {
      await deleteMyAssistantThread(threadId);
      const remaining = threads.filter((thread) => thread.id !== threadId);
      setThreads(remaining);
      if (activeThreadId !== threadId) return;
      if (remaining[0]) {
        const loaded = await getMyAssistantThreadMessages(remaining[0].id);
        if (loaded) {
          setActiveThreadId(loaded.thread.id);
          setActiveMessages(loaded.messages);
          return;
        }
      }
      const thread = await createMyAssistantThread();
      setThreads([thread]);
      setActiveThreadId(thread.id);
      setActiveMessages([]);
    });
  }

  return (
    <div className="flex min-h-[70vh] flex-1 flex-col gap-4 lg:flex-row">
      <Card className="flex w-full shrink-0 flex-col lg:w-72">
        <CardHeader className="space-y-3 border-b">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Conversations</CardTitle>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleNewChat}
              disabled={isPending}
            >
              <Plus className="size-4" />
              New
            </Button>
          </div>
          <CardDescription>Saved chats stay available after refresh.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-[28vh] lg:h-[58vh]">
            <div className="flex flex-col gap-1 p-2">
              {threads.length === 0 ? (
                <p className="px-2 py-4 text-sm text-muted-foreground">No conversations yet.</p>
              ) : (
                threads.map((thread) => (
                  <div
                    key={thread.id}
                    className={cn(
                      "group flex items-center gap-1 rounded-md border border-transparent px-2 py-2",
                      activeThreadId === thread.id ? "border-border bg-muted" : "hover:bg-muted/60",
                    )}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left text-sm"
                      onClick={() => selectThread(thread.id)}
                      disabled={isPending}
                    >
                      <span className="line-clamp-2">{formatThreadLabel(thread)}</span>
                    </button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7 opacity-60 group-hover:opacity-100"
                      onClick={() => handleDeleteThread(thread.id)}
                      disabled={isPending}
                      aria-label="Delete conversation"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          {loadError ? (
            <p className="border-t px-3 py-2 text-xs text-destructive">{loadError}</p>
          ) : null}
        </CardContent>
      </Card>

      <AssistantChatPane
        key={activeThreadId}
        threadId={activeThreadId}
        initialMessages={activeMessages}
        onThreadUpdated={handleThreadUpdated}
      />
    </div>
  );
}
