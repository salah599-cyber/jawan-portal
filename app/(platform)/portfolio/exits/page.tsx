import { forbidden } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { ExitsTable } from "@/components/exits/exits-table";
import { getUnifiedExits, summarizeExits } from "@/lib/portfolio/exit-analytics";
import { formatMoney } from "@/lib/format";
import { formatRoiPct } from "@/lib/portfolio/exit-metrics";
import { canAccess, canWrite, requireUserContext } from "@/lib/permissions/access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PortfolioExitsPage() {
  const ctx = await requireUserContext();
  const hasAccess =
    canAccess(ctx, "ASSETS") ||
    canAccess(ctx, "PRIVATE_EQUITY") ||
    canAccess(ctx, "REAL_ESTATE");
  if (!hasAccess) forbidden();

  const exits = await getUnifiedExits(ctx);
  const summary = summarizeExits(exits);
  const pendingCount = exits.filter((exit) => exit.settlementStatus === "PENDING").length;
  const canAssignProceeds = canWrite(ctx, "ASSETS");

  return (
    <>
      <PlatformHeader title="Exits" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total exits</CardDescription>
              <CardTitle className="text-2xl">{summary.exitCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total proceeds (OMR)</CardDescription>
              <CardTitle className="text-2xl">{formatMoney(summary.totalProceedsOmr, "OMR")}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Realized gain (OMR)</CardDescription>
              <CardTitle className="text-2xl">
                {formatMoney(summary.totalRealizedGainOmr, "OMR")}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg ROI</CardDescription>
              <CardTitle className="text-2xl">{formatRoiPct(summary.averageRoiPct)}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {pendingCount > 0 ? (
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Proceeds awaiting bank assignment</CardTitle>
              <CardDescription>
                {pendingCount} exit{pendingCount === 1 ? "" : "s"} have proceeds in the suspense
                account. Assign each to the bank account that received the funds.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Exit history</CardTitle>
            <CardDescription>
              Exited positions are tracked here and excluded from active portfolio net worth.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExitsTable exits={exits} canAssignProceeds={canAssignProceeds} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
