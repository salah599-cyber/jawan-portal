import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron/verify";

/** Document expiry alerts are included in the unified calendar digest cron. */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    job: "document-expiry",
    delegatedTo: "calendar-digest",
    skipped: true,
  });
}
