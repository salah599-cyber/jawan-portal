import { forbidden, notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { EditLpCommitmentForm } from "@/components/lp/edit-lp-commitment-form";
import { getLpCommitment } from "@/lib/data/lp-fund";
import { listEntities } from "@/lib/data/entities";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";

export default async function EditFundLpCommitmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireModuleAccess("FUND_LP");
  if (!canWrite(ctx, "FUND_LP")) forbidden();

  const [commitment, entities] = await Promise.all([
    getLpCommitment(ctx, id),
    listEntities(),
  ]);
  if (!commitment) notFound();

  return (
    <>
      <PlatformHeader title={`Edit ${commitment.fund.name}`} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <EditLpCommitmentForm commitment={commitment} entities={entities} />
      </main>
    </>
  );
}
