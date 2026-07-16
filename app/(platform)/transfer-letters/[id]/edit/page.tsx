import { forbidden, notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { TransferLetterForm } from "@/components/transfer-letters/transfer-letter-form";
import { listEntities } from "@/lib/data/entities";
import {
  getTransferLetter,
  listTransferLetterBankAccountOptions,
} from "@/lib/actions/transfer-letters";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { transferLetterToFormData } from "@/lib/transfer/serialize";

export default async function EditTransferLetterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) forbidden();

  const [letter, entities, bankAccounts] = await Promise.all([
    getTransferLetter(id),
    listEntities(),
    listTransferLetterBankAccountOptions(),
  ]);

  if (!letter) notFound();

  return (
    <>
      <PlatformHeader title="Edit Transfer Letter" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <TransferLetterForm
          entities={entities}
          bankAccounts={bankAccounts}
          initialData={transferLetterToFormData(letter)}
          letterId={letter.id}
          serialNumber={letter.serialNumber}
        />
      </main>
    </>
  );
}
