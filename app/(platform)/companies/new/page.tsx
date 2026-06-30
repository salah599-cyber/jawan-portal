import { forbidden } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { CreateCompanyForm } from "@/components/companies/create-company-form";
import { listEntities } from "@/lib/data/entities";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";

export default async function NewCompanyPage() {
  const ctx = await requireModuleAccess("COMPANIES");
  if (!canWrite(ctx, "COMPANIES")) forbidden();
  const entities = await listEntities();

  return (
    <>
      <PlatformHeader title="Register Company" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <CreateCompanyForm entities={entities} />
      </main>
    </>
  );
}
