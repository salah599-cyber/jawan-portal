import { NextResponse } from "next/server";
import { sendCalendarDigests } from "@/lib/calendar/digest";
import { isAuthorizedCronRequest } from "@/lib/cron/verify";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
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
