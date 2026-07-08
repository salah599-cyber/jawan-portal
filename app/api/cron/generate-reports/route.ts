import { NextResponse } from "next/server";

/**
 * Cron stub for scheduled report generation.
 * Extend this to email board packs or persist snapshots when scheduling is added.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    job: "generate-reports",
    message: "Scheduled report generation is not configured yet. Use /reports to export manually.",
  });
}
