import { forbidden } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { TransferLetterForm } from "@/components/transfer-letters/transfer-letter-form";
import { listEntities } from "@/lib/data/entities";
import { listTransferLetterBankAccountOptions } from "@/lib/actions/transfer-letters";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";

export default async function NewTransferLetterPage({
  searchParams,
}: {
  searchParams: Promise<{ sourceBankAccountId?: string }>;
}) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) forbidden();

  const { sourceBankAccountId } = await searchParams;

  const [entities, bankAccounts] = await Promise.all([
    listEntities(),
    listTransferLetterBankAccountOptions(),
  ]);

  return (
    <>
      <PlatformHeader title="New Transfer Letter" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <TransferLetterForm
          entities={entities}
          bankAccounts={bankAccounts}
          preselectedBankAccountId={sourceBankAccountId}
        />
      </main>
    </>
  );
}
