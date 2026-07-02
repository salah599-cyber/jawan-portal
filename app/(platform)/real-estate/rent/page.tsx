import Link from "next/link";
import { PlatformHeader } from "@/components/platform/platform-header";
import { RentDashboardClient } from "@/components/real-estate/rent-dashboard-client";
import { getRentDashboard, listRePortfolioEntities } from "@/lib/data/real-estate";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Button } from "@/components/ui/button";

export default async function RentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string }>;
}) {
  const params = await searchParams;
  const ctx = await requireModuleAccess("REAL_ESTATE");

  const entities = await listRePortfolioEntities(ctx);
  const entityId =
    params.entity && entities.some((e) => e.id === params.entity) ? params.entity : entities[0]?.id;

  const dashboard = await getRentDashboard(ctx, entityId ? { entityId } : undefined);
  const canEdit = canWrite(ctx, "REAL_ESTATE");

  return (
    <>
      <PlatformHeader title="Rent Collection" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Rent Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              Cross-property rent collection, overdue tracking, and PDC clearance.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/real-estate">Portfolio</Link>
          </Button>
        </div>
        <RentDashboardClient
          dashboard={dashboard}
          canEdit={canEdit}
          entities={entities}
          entityId={entityId}
        />
      </main>
    </>
  );
}
