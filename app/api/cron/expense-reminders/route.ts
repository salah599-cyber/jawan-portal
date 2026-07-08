import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron/verify";

/** Expense reminders are included in the unified calendar digest cron. */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    job: "expense-reminders",
    delegatedTo: "calendar-digest",
    skipped: true,
  });
}
