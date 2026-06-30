import { forbidden, notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { EditLoanForm } from "@/components/loans/edit-loan-form";
import { getLoan, listLoanAssetOptions } from "@/lib/actions/loans";
import { listEntities } from "@/lib/data/entities";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";

export default async function EditLoanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireModuleAccess("LOANS");
  if (!canWrite(ctx, "LOANS")) forbidden();

  const [loan, entities, assets] = await Promise.all([
    getLoan(id),
    listEntities(),
    listLoanAssetOptions(),
  ]);
  if (!loan) notFound();

  return (
    <>
      <PlatformHeader title="Edit Loan" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <EditLoanForm loan={loan} entities={entities} assets={assets} />
      </main>
    </>
  );
}
