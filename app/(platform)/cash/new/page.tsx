import Link from "next/link";
import { PlatformHeader } from "@/components/platform/platform-header";
import { CreateCashAccountForm } from "@/components/cash/create-cash-account-form";
import { UploadStatementForm } from "@/components/cash/upload-statement-form";
import { listEntities } from "@/lib/data/entities";
import {
  getCashStatementImportForPrefill,
  listCashAccountCandidates,
} from "@/lib/data/cash-management";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { forbidden } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function NewCashAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ importId?: string }>;
}) {
  const ctx = await requireModuleAccess("CASH_MANAGEMENT");
  if (!canWrite(ctx, "CASH_MANAGEMENT")) forbidden();

  const { importId } = await searchParams;
  const [entities, accountCandidates, prefill] = await Promise.all([
    listEntities(),
    listCashAccountCandidates(ctx),
    importId ? getCashStatementImportForPrefill(importId, ctx) : Promise.resolve(null),
  ]);

  return (
    <>
      <PlatformHeader title="Add Bank Account" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/cash">Back to Cash</Link>
          </Button>
        </div>

        {prefill ? null : (
          <UploadStatementForm
            accounts={accountCandidates}
            title="Start from a Bank Statement"
            description="Upload a PDF statement to pre-fill account details. If no matching account exists, you can create one from the parsed data."
          />
        )}

        <CreateCashAccountForm entities={entities} prefill={prefill} />
      </main>
    </>
  );
}
