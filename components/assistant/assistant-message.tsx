"use client";

import type { UIMessage } from "ai";
import Link from "next/link";
import { AssistantChartView } from "@/components/assistant/assistant-chart";
import {
  extractChartsFromToolOutput,
  extractCitationsFromToolOutput,
  type AssistantCitation,
} from "@/lib/assistant/types";
import { cn } from "@/lib/utils";

function collectChartsFromMessage(message: UIMessage) {
  const charts = new Map<string, ReturnType<typeof extractChartsFromToolOutput>[number]>();

  for (const part of message.parts) {
    if (!part.type.startsWith("tool-")) continue;
    const toolPart = part as {
      type: string;
      state?: string;
      output?: unknown;
    };
    if (toolPart.state !== "output-available" || toolPart.output == null) continue;
    for (const chart of extractChartsFromToolOutput(toolPart.output)) {
      charts.set(`${chart.title}-${chart.type}`, chart);
    }
  }

  return [...charts.values()];
}

function collectCitationsFromMessage(message: UIMessage): AssistantCitation[] {
  const citations: AssistantCitation[] = [];
  const seen = new Set<string>();

  for (const part of message.parts) {
    if (!part.type.startsWith("tool-")) continue;
    const toolPart = part as {
      type: string;
      state?: string;
      output?: unknown;
    };
    if (toolPart.state !== "output-available" || toolPart.output == null) continue;
    for (const item of extractCitationsFromToolOutput(toolPart.output)) {
      const key = `${item.href}::${item.label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      citations.push(item);
    }
  }

  return citations;
}

export function AssistantMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const charts = isUser ? [] : collectChartsFromMessage(message);
  const citations = isUser ? [] : collectCitationsFromMessage(message);
  const textParts = message.parts.filter((part) => part.type === "text");

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {textParts.length > 0 ? (
          textParts.map((part, index) =>
            part.type === "text" ? (
              <p key={`${message.id}-text-${index}`} className="whitespace-pre-wrap">
                {part.text}
              </p>
            ) : null,
          )
        ) : !isUser ? (
          <p className="text-muted-foreground">Thinking…</p>
        ) : null}

        {!isUser
          ? charts.map((chart) => <AssistantChartView key={`${message.id}-${chart.title}`} chart={chart} />)
          : null}

        {!isUser && citations.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
            {citations.slice(0, 10).map((item) => (
              <Link
                key={`${message.id}-${item.href}-${item.label}`}
                href={item.href}
                className="inline-flex max-w-full items-center truncate rounded-md border bg-background px-2 py-0.5 text-xs text-foreground transition-colors hover:bg-accent"
              >
                {item.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
