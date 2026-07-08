import Link from "next/link";
import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { RePrivatePortfolioClient } from "@/components/real-estate/private/re-private-portfolio-client";
import {
  getPrivatePortfolioSummary,
  listPrivatePortfolioEntities,
  listPrivateProperties,
} from "@/lib/data/private-real-estate";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RePropertyStatus } from "@/lib/generated/prisma/client";

function PrivateReLoadError({ message }: { message: string }) {
  return (
    <>
      <PlatformHeader title="Private Real Estate" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Could not load private real estate portfolio</CardTitle>
            <CardDescription>
              The real estate database tables could not be loaded. Schema sync may still be in progress.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button type="button" asChild>
              <Link href="/real-estate/private">Try again</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

async function loadPrivateRealEstatePageData(
  ctx: Awaited<ReturnType<typeof requireModuleAccess>>,
  params: { entity?: string; governorate?: string; status?: string; search?: string },
) {
  const entities = await listPrivatePortfolioEntities(ctx);
  const entityId =
    params.entity && entities.some((e) => e.id === params.entity) ? params.entity : entities[0]?.id;

  const filters = {
    entityId,
    governorate: params.governorate,
    status: params.status as RePropertyStatus | undefined,
    search: params.search,
  };

  const [summary, properties] = await Promise.all([
    getPrivatePortfolioSummary(ctx, entityId),
    listPrivateProperties(ctx, filters),
  ]);

  return { entities, entityId, summary, properties, canEdit: canWrite(ctx, "REAL_ESTATE") };
}

export default async function PrivateRealEstatePortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{
    entity?: string;
    governorate?: string;
    status?: string;
    search?: string;
  }>;
}) {
  const params = await searchParams;
  const ctx = await requireModuleAccess("REAL_ESTATE");

  let data: Awaited<ReturnType<typeof loadPrivateRealEstatePageData>>;
  try {
    data = await loadPrivateRealEstatePageData(ctx, params);
  } catch (error) {
    console.error("Private real estate portfolio page failed:", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "An unexpected error occurred while loading the portfolio.";
    return <PrivateReLoadError message={message} />;
  }

  const { entities, entityId, summary, properties, canEdit } = data;

  return (
    <>
      <PlatformHeader title="Private Real Estate" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Family Villas</h2>
            <p className="text-sm text-muted-foreground">
              Track family-owned villas, running costs, household staff, and succession planning.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/real-estate">Investment Portfolio</Link>
            </Button>
            {canEdit ? <AddLinkButton href="/real-estate/private/new" label="Add Villa" /> : null}
          </div>
        </div>

        <RePrivatePortfolioClient
          properties={properties}
          summary={summary}
          canEdit={canEdit}
          entities={entities}
          entityId={entityId}
        />
      </main>
    </>
  );
}
