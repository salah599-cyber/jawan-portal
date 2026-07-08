import { notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { EditSuccessionPlanForm } from "@/components/succession/edit-succession-plan-form";
import { getSuccessionPlan } from "@/lib/actions/succession";
import { listEntities } from "@/lib/data/entities";
import { serializeSuccessionPlan } from "@/lib/succession/serialize";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { forbidden } from "next/navigation";

export default async function EditSuccessionPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireModuleAccess("SUCCESSION");
  if (!canWrite(ctx, "SUCCESSION")) forbidden();

  const [plan, entities] = await Promise.all([getSuccessionPlan(id), listEntities()]);
  if (!plan) notFound();

  return (
    <>
      <PlatformHeader title={`Edit ${plan.title}`} />
      <EditSuccessionPlanForm plan={serializeSuccessionPlan(plan)} entities={entities} />
    </>
  );
}
