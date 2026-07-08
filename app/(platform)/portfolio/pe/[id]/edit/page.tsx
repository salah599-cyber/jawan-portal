import { forbidden } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { EditPeCompanyForm } from "@/components/pe/edit-pe-company-form";
import { getPeCompany } from "@/lib/data/pe-portfolio";
import { listEntities } from "@/lib/data/entities";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { notFound } from "next/navigation";

export default async function EditPeCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireModuleAccess("PRIVATE_EQUITY");
  if (!canWrite(ctx, "PRIVATE_EQUITY")) forbidden();

  const [company, entities] = await Promise.all([
    getPeCompany(ctx, id),
    listEntities(),
  ]);
  if (!company) notFound();

  return (
    <>
      <PlatformHeader title={`Edit ${company.name}`} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <EditPeCompanyForm company={company} entities={entities} />
      </main>
    </>
  );
}
