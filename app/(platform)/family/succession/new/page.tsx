import { PlatformHeader } from "@/components/platform/platform-header";
import { CreateSuccessionPlanForm } from "@/components/succession/create-succession-plan-form";
import { listEntities } from "@/lib/data/entities";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { forbidden } from "next/navigation";

export default async function NewSuccessionPlanPage() {
  const ctx = await requireModuleAccess("SUCCESSION");
  if (!canWrite(ctx, "SUCCESSION")) forbidden();

  const entities = await listEntities();

  return (
    <>
      <PlatformHeader title="New Succession Plan" />
      <CreateSuccessionPlanForm entities={entities} />
    </>
  );
}
