import { NextResponse } from "next/server";
import { sendCalendarDigests } from "@/lib/calendar/digest";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendCalendarDigests();
    return NextResponse.json({ ok: true, job: "calendar-digest", ...result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        job: "calendar-digest",
        error: error instanceof Error ? error.message : "Digest failed.",
      },
      { status: 500 },
    );
  }
}
