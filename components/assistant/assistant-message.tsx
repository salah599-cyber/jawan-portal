"use client";

import type { UIMessage } from "ai";
import { AssistantChartView } from "@/components/assistant/assistant-chart";
import { extractChartsFromToolOutput } from "@/lib/assistant/types";
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

export function AssistantMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const charts = isUser ? [] : collectChartsFromMessage(message);
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
      </div>
    </div>
  );
}
