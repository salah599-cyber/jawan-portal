import Link from "next/link";
import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { LpCommitmentsTable } from "@/components/lp/lp-commitments-table";
import { LpPortfolioSummaryCards } from "@/components/lp/lp-portfolio-summary";
import {
  getLpPortfolioSummary,
  listLpCommitments,
  listLpPortfolioEntities,
} from "@/lib/data/lp-fund";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FundLpPortfolioFilters } from "@/components/lp/fund-lp-portfolio-filters";

function LpLoadError({ message, digest }: { message: string; digest?: string }) {
  return (
    <>
      <PlatformHeader title="Fund LP Investments" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Could not load Fund LP portfolio</CardTitle>
            <CardDescription>
              The Fund LP database tables could not be loaded. This usually means the schema
              sync has not completed yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{message}</p>
            {digest ? (
              <p className="text-xs text-muted-foreground">Reference: {digest}</p>
            ) : null}
            <Button type="button" asChild>
              <Link href="/portfolio/fund-lp">Try again</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

async function loadFundLpPageData(ctx: Awaited<ReturnType<typeof requireModuleAccess>>, entityParam?: string) {
  const entities = await listLpPortfolioEntities(ctx);
  const entityId = entityParam && entities.some((entity) => entity.id === entityParam)
    ? entityParam
    : entities[0]?.id;

  const [summary, commitments] = await Promise.all([
    getLpPortfolioSummary(ctx, entityId),
    listLpCommitments(ctx, entityId),
  ]);

  return { entities, entityId, summary, commitments, canEdit: canWrite(ctx, "FUND_LP") };
}

export default async function FundLpPortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string }>;
}) {
  const { entity: entityParam } = await searchParams;
  const ctx = await requireModuleAccess("FUND_LP");

  let data: Awaited<ReturnType<typeof loadFundLpPageData>>;
  try {
    data = await loadFundLpPageData(ctx, entityParam);
  } catch (error) {
    console.error("Fund LP portfolio page failed:", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "An unexpected error occurred while loading the Fund LP portfolio.";
    const digest =
      error instanceof Error && "digest" in error
        ? String((error as Error & { digest?: string }).digest ?? "")
        : undefined;

    return <LpLoadError message={message} digest={digest || undefined} />;
  }

  const { entities, entityId, summary, commitments, canEdit } = data;

  return (
    <>
      <PlatformHeader title="Fund LP Investments" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Fund LP Investments</h2>
            <p className="text-sm text-muted-foreground">
              Track passive LP positions in externally managed funds — commitments, capital calls,
              distributions, and NAV.
            </p>
          </div>
          {canEdit ? <AddLinkButton href="/portfolio/fund-lp/new" label="Add Commitment" /> : null}
        </div>

        <FundLpPortfolioFilters entityId={entityId} entities={entities} />

        <LpPortfolioSummaryCards summary={summary} />

        <Card>
          <CardHeader>
            <CardTitle>Fund Commitments</CardTitle>
            <CardDescription>
              LP positions across buyout, venture, growth, and other fund strategies.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LpCommitmentsTable commitments={commitments} canEdit={canEdit} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
