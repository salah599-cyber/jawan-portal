import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { EditLinkButton } from "@/components/platform/edit-link-button";
import { PeCompanyHub } from "@/components/pe/pe-company-hub";
import { deletePeCompany } from "@/lib/actions/pe-portfolio";
import { getPeCompany } from "@/lib/data/pe-portfolio";
import { serializePeCompany } from "@/lib/pe/serialize";
import { buildFileAccessContext } from "@/lib/files/download-access";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { PE_STAGE_LABELS, PE_STATUS_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function PeCompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const ctx = await requireModuleAccess("PRIVATE_EQUITY");
  const company = await getPeCompany(ctx, id);
  if (!company) notFound();

  const serialized = serializePeCompany(company);
  const canEdit = canWrite(ctx, "PRIVATE_EQUITY");
  const fileAccess = await buildFileAccessContext(
    ctx,
    company.documents.map((doc) => ({ kind: "pe-company" as const, fileId: doc.id })),
  );

  return (
    <>
      <PlatformHeader title={company.name} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/portfolio/pe">Back to Portfolio</Link>
          </Button>
          {company.assetId ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/assets/${company.assetId}`}>View in Assets</Link>
            </Button>
          ) : null}
          {canEdit ? (
            <>
              <EditLinkButton href={`/portfolio/pe/${company.id}/edit`} />
              <DeleteEntryButton
                itemId={company.id}
                itemLabel={company.name}
                deleteAction={deletePeCompany}
                redirectTo="/portfolio/pe"
                title="Delete company?"
                description="This will permanently delete the company, linked asset, and all related records and documents."
              />
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{PE_STAGE_LABELS[company.stage] ?? company.stage}</Badge>
          <Badge variant="secondary">{PE_STATUS_LABELS[company.status] ?? company.status}</Badge>
          {company.sector ? <Badge variant="outline">{company.sector}</Badge> : null}
          {company.country ? <Badge variant="outline">{company.country}</Badge> : null}
          <span className="text-sm text-muted-foreground">{company.entity.name} · {company.reportingCurrency}</span>
        </div>

        <PeCompanyHub company={serialized} canEdit={canEdit} defaultTab={tab ?? "overview"} fileAccess={fileAccess} />
      </main>
    </>
  );
}
