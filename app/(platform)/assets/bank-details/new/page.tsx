import { PlatformHeader } from "@/components/platform/platform-header";
import { CreateBankForm } from "@/components/bank/create-bank-form";
import { listEntities } from "@/lib/data/entities";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { forbidden } from "next/navigation";

export default async function NewBankAccountPage() {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) forbidden();

  const entities = await listEntities();

  return (
    <>
      <PlatformHeader title="Add Bank Account" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <CreateBankForm entities={entities} />
      </main>
    </>
  );
}
