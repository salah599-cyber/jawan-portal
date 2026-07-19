import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { NextResponse } from "next/server";
import { ASSISTANT_SYSTEM_PROMPT } from "@/lib/assistant/system-prompt";
import { createAssistantTools } from "@/lib/assistant/tools";
import { getCurrentUserContext } from "@/lib/permissions/access";

export const maxDuration = 60;

function getAssistantModel() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  return openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini");
}

export async function POST(request: Request) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const model = getAssistantModel();
  if (!model) {
    return NextResponse.json(
      {
        error:
          "AI assistant is not configured. Set OPENAI_API_KEY in the environment.",
      },
      { status: 503 },
    );
  }

  let messages: UIMessage[];
  try {
    const body = (await request.json()) as { messages?: UIMessage[] };
    messages = body.messages ?? [];
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const tools = createAssistantTools(ctx);

  const result = streamText({
    model,
    system: `${ASSISTANT_SYSTEM_PROMPT}\n\nUser role: ${ctx.role}. Today's date: ${today}.`,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
