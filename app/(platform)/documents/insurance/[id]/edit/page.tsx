import { forbidden, notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { EditInsurancePolicyForm } from "@/components/insurance/edit-insurance-policy-form";
import { getInsurancePolicy } from "@/lib/actions/insurance";
import { listEntities } from "@/lib/data/entities";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";

export default async function EditInsurancePolicyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireModuleAccess("INSURANCE");
  if (!canWrite(ctx, "INSURANCE")) forbidden();

  const [policy, entities] = await Promise.all([
    getInsurancePolicy(id),
    listEntities(),
  ]);
  if (!policy) notFound();

  return (
    <>
      <PlatformHeader title={`Edit ${policy.policyNumber}`} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <EditInsurancePolicyForm policy={policy} entities={entities} />
      </main>
    </>
  );
}
