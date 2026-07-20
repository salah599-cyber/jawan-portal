"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot, Loader2, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AssistantMessage } from "@/components/assistant/assistant-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

const SUGGESTED_PROMPTS = [
  "What's my debt-to-equity ratio?",
  "Show my asset allocation",
  "How has net worth changed this year?",
  "What liabilities are coming due soon?",
  "Summarize my cash position",
  "What's my PE portfolio MOIC?",
];

export function AssistantChat() {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/assistant/chat",
    }),
  });

  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

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
              Ask about net worth, allocation, liabilities, cash, PE/LP, real estate, and more.
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
            <Button type="submit" size="icon" disabled={isBusy || !input.trim()} aria-label="Send message">
              <Send className="size-4" />
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Answers are based on live platform data. Not tax or investment advice.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
