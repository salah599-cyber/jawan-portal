import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { AssetsFilterTabs, type AssetsFilter } from "@/components/assets/assets-filter-tabs";
import { AssetsTable } from "@/components/assets/assets-table";
import { listAssets } from "@/lib/actions/assets";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function parseFilter(value?: string): AssetsFilter {
  if (value === "active" || value === "exited") return value;
  return "all";
}

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: filterParam } = await searchParams;
  const filter = parseFilter(filterParam);
  const ctx = await requireModuleAccess("ASSETS");
  const assets = await listAssets(filter);
  const showAdd = canWrite(ctx, "ASSETS");

  return (
    <>
      <PlatformHeader title="Assets" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-3">
              <div>
                <CardTitle>Assets</CardTitle>
                <CardDescription>
                  Manage real estate, private equity, public markets, and more.
                </CardDescription>
              </div>
              <AssetsFilterTabs current={filter} />
            </div>
            {showAdd ? <AddLinkButton href="/assets/new" label="Add Asset" /> : null}
          </CardHeader>
          <CardContent>
            <AssetsTable
              assets={assets}
              showAdd={showAdd}
              emptyMessage={
                filter === "exited" ? "No exited assets." : filter === "active" ? "No active assets." : "No assets yet."
              }
            />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
