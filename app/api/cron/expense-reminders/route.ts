import { NextResponse } from "next/server";

/** Expense reminders are included in the unified calendar digest cron. */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    job: "expense-reminders",
    delegatedTo: "calendar-digest",
    skipped: true,
  });
}
