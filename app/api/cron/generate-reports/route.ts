import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron/verify";
import { sendMonthlyBoardPacks } from "@/lib/reports/board-pack-email";

/**
 * Monthly Board Pack delivery.
 * Scheduled on the 1st of each month. Generates the executive pack and
 * emails users with Reports + Assets access.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendMonthlyBoardPacks();
    return NextResponse.json({ ok: true, job: "generate-reports", ...result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        job: "generate-reports",
        error: error instanceof Error ? error.message : "Board pack generation failed.",
      },
      { status: 500 },
    );
  }
}
