import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { refreshPreciousMetalPrices } from "@/lib/assets/refresh-precious-metal-prices";
import { isAuthorizedCronRequest } from "@/lib/cron/verify";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshPreciousMetalPrices();

    revalidatePath("/assets");
    revalidatePath("/dashboard");

    return NextResponse.json({
      ok: true,
      job: "refresh-precious-metal-prices",
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        job: "refresh-precious-metal-prices",
        error: error instanceof Error ? error.message : "Price refresh failed.",
      },
      { status: 500 },
    );
  }
}
