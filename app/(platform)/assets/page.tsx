import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { listAssets } from "@/lib/actions/assets";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { ASSET_CATEGORY_LABELS, ASSET_STATUS_LABELS } from "@/lib/labels";
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

export default async function AssetsPage() {
  const ctx = await requireModuleAccess("ASSETS");
  const assets = await listAssets();
  const showAdd = canWrite(ctx, "ASSETS");

  return (
    <>
      <PlatformHeader title="Assets" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Assets</CardTitle>
              <CardDescription>
                Manage real estate, private equity, public markets, and more.
              </CardDescription>
            </div>
            {showAdd ? <AddLinkButton href="/assets/new" label="Add Asset" /> : null}
          </CardHeader>
          <CardContent>
            {assets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assets yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Current Value</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell>{ASSET_CATEGORY_LABELS[asset.category] ?? asset.category}</TableCell>
                      <TableCell>{asset.entity.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {ASSET_STATUS_LABELS[asset.status] ?? asset.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(asset.currentValue, asset.currency)}
                      </TableCell>
                      <TableCell>{formatDate(asset.updatedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
