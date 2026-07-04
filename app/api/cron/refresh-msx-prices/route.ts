import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { PUBLIC_MARKETS_PATH } from "@/lib/public-markets/constants";
import { refreshMsxEodPrices } from "@/lib/public-markets/refresh-prices";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshMsxEodPrices();

    revalidatePath(PUBLIC_MARKETS_PATH);
    revalidatePath("/portfolio/msx");
    revalidatePath("/dashboard");
    revalidatePath("/assets");

    return NextResponse.json({
      ok: true,
      job: "refresh-msx-prices",
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        job: "refresh-msx-prices",
        error: error instanceof Error ? error.message : "MSX price refresh failed.",
      },
      { status: 500 },
    );
  }
}
