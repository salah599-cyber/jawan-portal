import { forbidden } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { CreateLpCommitmentForm } from "@/components/lp/create-lp-commitment-form";
import { listEntities } from "@/lib/data/entities";
import { listLpFunds } from "@/lib/data/lp-fund";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";

export default async function NewFundLpCommitmentPage() {
  const ctx = await requireModuleAccess("FUND_LP");
  if (!canWrite(ctx, "FUND_LP")) forbidden();

  const [entities, funds] = await Promise.all([listEntities(), listLpFunds(ctx)]);

  const existingFunds = funds.map((fund) => ({
    id: fund.id,
    name: fund.name,
    gpName: fund.gpManager?.name ?? null,
    strategy: fund.strategy,
  }));

  return (
    <>
      <PlatformHeader title="Add Fund LP Commitment" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <CreateLpCommitmentForm entities={entities} existingFunds={existingFunds} />
      </main>
    </>
  );
}
