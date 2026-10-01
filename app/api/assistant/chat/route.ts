import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  generateId,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { createGoogle } from "@ai-sdk/google";
import { NextResponse } from "next/server";
import { ASSISTANT_SYSTEM_PROMPT } from "@/lib/assistant/system-prompt";
import {
  getAssistantThreadForUser,
  persistAssistantMessages,
} from "@/lib/assistant/persistence";
import { createAssistantTools } from "@/lib/assistant/tools";
import { getCurrentUserContext } from "@/lib/permissions/access";

export const maxDuration = 60;

function getAssistantModel() {
  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return null;
  }
  // gemini-2.5-flash-lite is unavailable for new API users; flash-latest works on free tier.
  const provider = createGoogle({ apiKey });
  return provider(process.env.GEMINI_MODEL ?? "gemini-flash-latest");
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
          "AI assistant is not configured. Set GOOGLE_GENERATIVE_AI_API_KEY in the environment.",
      },
      { status: 503 },
    );
  }

  let messages: UIMessage[];
  let threadId: string | undefined;
  try {
    const body = (await request.json()) as {
      messages?: UIMessage[];
      threadId?: string;
    };
    messages = body.messages ?? [];
    threadId = typeof body.threadId === "string" ? body.threadId : undefined;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!threadId) {
    return NextResponse.json({ error: "threadId is required." }, { status: 400 });
  }

  const thread = await getAssistantThreadForUser(ctx.id, threadId);
  if (!thread) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const tools = createAssistantTools(ctx);

  const result = streamText({
    model,
    system: `${ASSISTANT_SYSTEM_PROMPT}\n\nUser role: ${ctx.role}. Today's date: ${today}.`,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
    onError: ({ error }) => {
      console.error("assistant/chat stream error:", error);
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      generateMessageId: generateId,
      onFinish: async ({ messages: nextMessages, isAborted }) => {
        if (isAborted) return;
        try {
          await persistAssistantMessages({
            userId: ctx.id,
            threadId,
            messages: nextMessages,
          });
        } catch (error) {
          console.error("assistant/chat persist error:", error);
        }
      },
    }),
  });
}
