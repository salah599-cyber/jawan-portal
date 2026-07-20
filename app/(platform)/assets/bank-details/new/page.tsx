import { PlatformHeader } from "@/components/platform/platform-header";
import { CreateBankForm } from "@/components/bank/create-bank-form";
import { listEntities } from "@/lib/data/entities";
import { parseBankAccountRegion } from "@/lib/bank/region";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { forbidden } from "next/navigation";

export default async function NewBankAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string }>;
}) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) forbidden();

  const { region } = await searchParams;
  const entities = await listEntities();
  const defaultRegion = parseBankAccountRegion(region);

  return (
    <>
      <PlatformHeader title={defaultRegion === "USA" ? "Add USA Bank Account" : "Add Bank Account"} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <CreateBankForm entities={entities} defaultRegion={defaultRegion} />
      </main>
    </>
  );
}
