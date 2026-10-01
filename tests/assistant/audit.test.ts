import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { extractAssistantToolNames } from "@/lib/assistant/tool-names";

describe("extractAssistantToolNames", () => {
  it("collects unique tool names from assistant tool parts", () => {
    const messages = [
      {
        id: "u1",
        role: "user",
        parts: [{ type: "text", text: "cash?" }],
      },
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-get_cash_balances",
            toolCallId: "c1",
            toolName: "get_cash_balances",
            state: "output-available",
            input: {},
            output: { totalOmr: 1 },
          },
          {
            type: "tool-get_cash_balances",
            toolCallId: "c2",
            toolName: "get_cash_balances",
            state: "output-available",
            input: {},
            output: { totalOmr: 1 },
          },
          {
            type: "tool-get_portfolio_summary",
            toolCallId: "c3",
            toolName: "get_portfolio_summary",
            state: "output-available",
            input: {},
            output: { netWorthTotalOmr: 2 },
          },
          { type: "text", text: "Here is your cash." },
        ],
      },
    ] as UIMessage[];

    expect(extractAssistantToolNames(messages)).toEqual([
      "get_cash_balances",
      "get_portfolio_summary",
    ]);
  });

  it("ignores user messages without tools", () => {
    const messages = [
      {
        id: "u1",
        role: "user",
        parts: [{ type: "text", text: "hello" }],
      },
    ] as UIMessage[];
    expect(extractAssistantToolNames(messages)).toEqual([]);
  });
});
