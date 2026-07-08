import { NextResponse } from "next/server";
import { FX_STALE_AFTER_MS } from "@/lib/fx/constants";
import { getLatestFxUpdatedAt, getRatesToOmr } from "@/lib/fx";
import { refreshFxRatesFromYahoo } from "@/lib/fx/refresh-rates";
import { requireModuleAccess } from "@/lib/permissions/access";

export async function GET() {
  try {
    await requireModuleAccess("DASHBOARD");

    let updatedAt = await getLatestFxUpdatedAt();
    const isStale =
      updatedAt == null || Date.now() - updatedAt.getTime() > FX_STALE_AFTER_MS;

    if (isStale) {
      try {
        await refreshFxRatesFromYahoo();
        updatedAt = await getLatestFxUpdatedAt();
      } catch {
        // Serve cached or fallback rates when refresh fails.
      }
    }

    const rates = await getRatesToOmr();

    return NextResponse.json({
      base: "OMR",
      rates,
      updatedAt: updatedAt?.toISOString() ?? null,
      source: "yahoo",
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
