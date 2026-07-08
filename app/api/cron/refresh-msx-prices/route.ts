import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { PUBLIC_MARKETS_PATH } from "@/lib/public-markets/constants";
import { refreshGccEodPrices } from "@/lib/public-markets/refresh-prices";
import { isAuthorizedCronRequest } from "@/lib/cron/verify";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshGccEodPrices();

    revalidatePath(PUBLIC_MARKETS_PATH);
    revalidatePath("/portfolio/msx");
    revalidatePath("/dashboard");
    revalidatePath("/assets");

    return NextResponse.json({
      ok: true,
      job: "refresh-gcc-eod-prices",
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        job: "refresh-gcc-eod-prices",
        error: error instanceof Error ? error.message : "MSX price refresh failed.",
      },
      { status: 500 },
    );
  }
}
