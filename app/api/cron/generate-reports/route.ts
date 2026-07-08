import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron/verify";

/**
 * Cron stub for scheduled report generation.
 * Extend this to email board packs or persist snapshots when scheduling is added.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    job: "generate-reports",
    message: "Scheduled report generation is not configured yet. Use /reports to export manually.",
  });
}
