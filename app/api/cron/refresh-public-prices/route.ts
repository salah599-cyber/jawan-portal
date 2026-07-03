import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { refreshPublicMarketPrices } from "@/lib/public-markets/refresh-prices";
import { PUBLIC_MARKETS_PATH } from "@/lib/public-markets/constants";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshPublicMarketPrices();

    revalidatePath(PUBLIC_MARKETS_PATH);
    revalidatePath("/portfolio/msx");
    revalidatePath("/dashboard");
    revalidatePath("/assets");

    return NextResponse.json({
      ok: true,
      job: "refresh-public-prices",
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        job: "refresh-public-prices",
        error: error instanceof Error ? error.message : "Price refresh failed.",
      },
      { status: 500 },
    );
  }
}
