import { PlatformHeader } from "@/components/platform/platform-header";
import { CreateAssetForm } from "@/components/assets/create-asset-form";
import { listEntities } from "@/lib/data/entities";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { forbidden } from "next/navigation";

export default async function NewAssetPage() {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) forbidden();

  const entities = await listEntities();

  return (
    <>
      <PlatformHeader title="Add Asset" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <CreateAssetForm entities={entities} />
      </main>
    </>
  );
}
