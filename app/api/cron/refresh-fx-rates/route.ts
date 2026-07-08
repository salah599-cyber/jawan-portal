import { NextResponse } from "next/server";
import { refreshFxRatesFromYahoo } from "@/lib/fx/refresh-rates";
import { isAuthorizedCronRequest } from "@/lib/cron/verify";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshFxRatesFromYahoo();

    return NextResponse.json({
      ok: true,
      job: "refresh-fx-rates",
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        job: "refresh-fx-rates",
        error: error instanceof Error ? error.message : "FX refresh failed.",
      },
      { status: 500 },
    );
  }
}
