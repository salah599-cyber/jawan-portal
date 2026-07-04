import { forbidden } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { CreateInsurancePolicyForm } from "@/components/insurance/create-insurance-policy-form";
import { listEntities } from "@/lib/data/entities";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";

export default async function NewInsurancePolicyPage() {
  const ctx = await requireModuleAccess("INSURANCE");
  if (!canWrite(ctx, "INSURANCE")) forbidden();
  const entities = await listEntities();

  return (
    <>
      <PlatformHeader title="Register Insurance Policy" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <CreateInsurancePolicyForm entities={entities} />
      </main>
    </>
  );
}
