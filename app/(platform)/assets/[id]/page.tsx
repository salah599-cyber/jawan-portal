import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { EditLinkButton } from "@/components/platform/edit-link-button";
import { AssetExitSummary } from "@/components/assets/asset-exit-summary";
import { RecordAssetExitForm } from "@/components/assets/record-asset-exit-form";
import { getAsset, deleteAsset } from "@/lib/actions/assets";
import { getAssetLinkedModule } from "@/lib/assets/linked-module";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { getAssetCategoryLabel } from "@/lib/assets/category-display";
import { ASSET_STATUS_LABELS } from "@/lib/labels";
import { formatMoney, formatDate, formatDecimalInput } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function linkedModule(asset: NonNullable<Awaited<ReturnType<typeof getAsset>>>) {
  return getAssetLinkedModule(asset);
}

function canRecordExit(
  ctx: Awaited<ReturnType<typeof requireModuleAccess>>,
  asset: NonNullable<Awaited<ReturnType<typeof getAsset>>>,
) {
  if (asset.status === "EXITED" || asset.exit) return false;
  if (getAssetLinkedModule(asset)) return false;
  return canWrite(ctx, "ASSETS");
}

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireModuleAccess("ASSETS");
  const asset = await getAsset(id);
  if (!asset) notFound();

  const linked = linkedModule(asset);
  const showWrite = canWrite(ctx, "ASSETS") && !linked;
  const showExit = canRecordExit(ctx, asset);

  return (
    <>
      <PlatformHeader title={asset.name} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/assets">Back to Assets</Link>
          </Button>
          {linked ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={linked.href}>View in {linked.label}</Link>
            </Button>
          ) : null}
          {showWrite ? (
            <>
              <EditLinkButton href={"/assets/" + asset.id + "/edit"} />
              <DeleteEntryButton
                itemId={asset.id}
                itemLabel={asset.name}
                deleteAction={deleteAsset}
                redirectTo="/assets"
                title="Delete asset?"
              />
            </>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Asset Details</CardTitle>
              <CardDescription>{getAssetCategoryLabel(asset)}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Detail label="Entity" value={asset.entity.name} />
              <Detail
                label="Status"
                value={
                  <Badge variant={asset.status === "EXITED" ? "outline" : "secondary"}>
                    {ASSET_STATUS_LABELS[asset.status] ?? asset.status}
                  </Badge>
                }
              />
              <Detail label="Acquisition Date" value={formatDate(asset.acquisitionDate)} />
              <Detail label="Acquisition Cost" value={formatMoney(asset.acquisitionCost, asset.currency)} />
              <Detail label="Current Value" value={formatMoney(asset.currentValue, asset.currency)} />
              <Detail label="Value Updated" value={formatDate(asset.valueUpdatedAt)} />
              {asset.exitedAt ? <Detail label="Exited At" value={formatDate(asset.exitedAt)} /> : null}
              <Detail label="Manager" value={asset.managerName} />
              <Detail label="Manager Email" value={asset.managerEmail} />
              {asset.description ? (
                <div className="sm:col-span-2">
                  <Detail label="Description" value={asset.description} />
                </div>
              ) : null}
            </CardContent>
          </Card>

          {showExit ? (
            <RecordAssetExitForm
              assetId={asset.id}
              assetName={asset.name}
              currency={asset.currency}
              acquisitionCost={formatDecimalInput(asset.acquisitionCost)}
            />
          ) : null}
        </div>

        {asset.landParcel && asset.status !== "EXITED" ? (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                This asset is linked to a land parcel. Record the sale from the{" "}
                <Link href={"/lands/" + asset.landParcel.id} className="font-medium text-primary underline-offset-4 hover:underline">
                  Lands module
                </Link>{" "}
                to exit it.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {asset.exit ? (
          <AssetExitSummary exit={asset.exit} assetId={asset.id} showActions={showWrite || showExit} />
        ) : null}
      </main>
    </>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode | string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{value ?? "—"}</div>
    </div>
  );
}
