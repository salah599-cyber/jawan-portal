import { notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { EditCashAccountForm } from "@/components/cash/edit-cash-account-form";
import { listEntities } from "@/lib/data/entities";
import { db } from "@/lib/db";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { cashBankAccountFilter } from "@/lib/permissions/scoped-queries";
import { forbidden } from "next/navigation";

export default async function EditCashAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireModuleAccess("CASH_MANAGEMENT");
  if (!canWrite(ctx, "CASH_MANAGEMENT")) forbidden();

  const account = await db.bankAccount.findFirst({
    where: { id, ...cashBankAccountFilter(ctx) },
  });
  if (!account) notFound();

  const entities = await listEntities();

  return (
    <>
      <PlatformHeader title={"Edit " + account.accountName} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <EditCashAccountForm account={account} entities={entities} />
      </main>
    </>
  );
}
