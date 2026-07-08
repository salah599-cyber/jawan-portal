import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { RePortfolioClient } from "@/components/real-estate/re-portfolio-client";
import {
  getPortfolioSummary,
  listProperties,
  listRePortfolioEntities,
} from "@/lib/data/real-estate";
import { getPortfolioAlerts } from "@/lib/real-estate/alerts";
import { rePropertyEntityFilter } from "@/lib/permissions/scoped-queries";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RePropertyStatus, RePropertyType } from "@/lib/generated/prisma/client";

function ReLoadError({ message }: { message: string }) {
  return (
    <>
      <PlatformHeader title="Real Estate" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Could not load Real Estate portfolio</CardTitle>
            <CardDescription>
              The real estate database tables could not be loaded. Schema sync may still be in progress.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button type="button" asChild>
              <Link href="/real-estate">Try again</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

export default async function RealEstatePortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{
    entity?: string;
    governorate?: string;
    propertyType?: string;
    status?: string;
    search?: string;
  }>;
}) {
  const params = await searchParams;
  const ctx = await requireModuleAccess("REAL_ESTATE");

  try {
    const entities = await listRePortfolioEntities(ctx);
    const entityId =
      params.entity && entities.some((e) => e.id === params.entity) ? params.entity : entities[0]?.id;

    const filters = {
      entityId,
      governorate: params.governorate,
      propertyType: params.propertyType as RePropertyType | undefined,
      status: params.status as RePropertyStatus | undefined,
      search: params.search,
    };

    const [summary, properties, alerts] = await Promise.all([
      getPortfolioSummary(ctx, entityId),
      listProperties(ctx, filters),
      getPortfolioAlerts(rePropertyEntityFilter(ctx)),
    ]);

    const canEdit = canWrite(ctx, "REAL_ESTATE");

    return (
      <>
        <PlatformHeader title="Real Estate" />
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Property Portfolio</h2>
              <p className="text-sm text-muted-foreground">
                Manage buildings, units, tenants, rent collection, and property operations.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/real-estate/rent">Rent Dashboard</Link>
              </Button>
              {canEdit ? <AddLinkButton href="/real-estate/new" label="Add Property" /> : null}
            </div>
          </div>

          <RePortfolioClient
            properties={properties}
            summary={summary}
            alerts={alerts}
            canEdit={canEdit}
            entities={entities}
            entityId={entityId}
          />
        </main>
      </>
    );
  } catch (error) {
    console.error("Real estate portfolio page failed:", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "An unexpected error occurred while loading the portfolio.";
    return <ReLoadError message={message} />;
  }
}
