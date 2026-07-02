import { forbidden, notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { EditAssetForm } from "@/components/assets/edit-asset-form";
import { getAsset } from "@/lib/actions/assets";
import { listAssetCategories } from "@/lib/data/asset-categories";
import { listEntities } from "@/lib/data/entities";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) forbidden();

  const [asset, entities, categories] = await Promise.all([
    getAsset(id),
    listEntities(),
    listAssetCategories(),
  ]);
  if (!asset) notFound();
  if (asset.landParcel || asset.vehicle) forbidden();

  return (
    <>
      <PlatformHeader title="Edit Asset" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <EditAssetForm asset={asset} entities={entities} categories={categories} />
      </main>
    </>
  );
}
