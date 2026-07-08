import { forbidden } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { CreatePeCompanyForm } from "@/components/pe/create-pe-company-form";
import { listEntities } from "@/lib/data/entities";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";

export default async function NewPeCompanyPage() {
  const ctx = await requireModuleAccess("PRIVATE_EQUITY");
  if (!canWrite(ctx, "PRIVATE_EQUITY")) forbidden();
  const entities = await listEntities();

  return (
    <>
      <PlatformHeader title="Add Portfolio Company" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <CreatePeCompanyForm entities={entities} />
      </main>
    </>
  );
}
