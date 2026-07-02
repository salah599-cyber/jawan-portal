import Link from "next/link";
import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { RowActions } from "@/components/platform/row-actions";
import { AssetsFilterTabs, type AssetsFilter } from "@/components/assets/assets-filter-tabs";
import { listAssets, deleteAsset } from "@/lib/actions/assets";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { getAssetCategoryDisplayName } from "@/lib/data/asset-categories";
import { ASSET_STATUS_LABELS } from "@/lib/labels";
import { formatMoney, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
            {assets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {filter === "exited" ? "No exited assets." : filter === "active" ? "No active assets." : "No assets yet."}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Acquired</TableHead>
                    <TableHead className="text-right">Current Value</TableHead>
                    <TableHead>Updated</TableHead>
                    {showAdd ? <TableHead className="w-[60px]">Actions</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => {
                    const linkedModule = asset.landParcel
                      ? "Lands"
                      : asset.vehicle
                        ? "Cars"
                        : asset.registeredCompany
                          ? "Companies"
                          : null;

                    return (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">
                          <Link href={"/assets/" + asset.id} className="hover:underline">
                            {asset.name}
                          </Link>
                        </TableCell>
                        <TableCell>{getAssetCategoryDisplayName(asset)}</TableCell>
                        <TableCell>{asset.entity.name}</TableCell>
                        <TableCell>
                          <Badge variant={asset.status === "EXITED" ? "outline" : "secondary"}>
                            {ASSET_STATUS_LABELS[asset.status] ?? asset.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(asset.acquisitionDate)}</TableCell>
                        <TableCell className="text-right">
                          {formatMoney(asset.currentValue, asset.currency)}
                        </TableCell>
                        <TableCell>{formatDate(asset.updatedAt)}</TableCell>
                        {showAdd ? (
                          <TableCell>
                            <RowActions
                              editHref={linkedModule ? undefined : "/assets/" + asset.id + "/edit"}
                              itemId={asset.id}
                              itemLabel={asset.name}
                              deleteAction={deleteAsset}
                              disableDelete={!!linkedModule}
                              disabledReason={
                                linkedModule
                                  ? "Linked to a " +
                                    (asset.landParcel
                                      ? "land parcel"
                                      : asset.vehicle
                                        ? "vehicle"
                                        : "company") +
                                    ". Manage from " +
                                    linkedModule +
                                    " instead."
                                  : undefined
                              }
                            />
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
