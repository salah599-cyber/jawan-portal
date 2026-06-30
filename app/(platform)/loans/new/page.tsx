import { forbidden } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { CreateLoanForm } from "@/components/loans/create-loan-form";
import { listEntities } from "@/lib/data/entities";
import { listLoanAssetOptions } from "@/lib/actions/loans";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";

export default async function NewLoanPage() {
  const ctx = await requireModuleAccess("LOANS");
  if (!canWrite(ctx, "LOANS")) forbidden();

  const [entities, assets] = await Promise.all([listEntities(), listLoanAssetOptions()]);

  return (
    <>
      <PlatformHeader title="Register Loan" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <CreateLoanForm entities={entities} assets={assets} />
      </main>
    </>
  );
}
