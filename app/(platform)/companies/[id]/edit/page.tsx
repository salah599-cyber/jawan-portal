import { forbidden, notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { EditCompanyForm } from "@/components/companies/edit-company-form";
import { getCompany } from "@/lib/actions/companies";
import { listEntities } from "@/lib/data/entities";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireModuleAccess("COMPANIES");
  if (!canWrite(ctx, "COMPANIES")) forbidden();

  const [company, entities] = await Promise.all([getCompany(id), listEntities()]);
  if (!company) notFound();

  return (
    <>
      <PlatformHeader title="Edit Company" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <EditCompanyForm company={company} entities={entities} />
      </main>
    </>
  );
}
