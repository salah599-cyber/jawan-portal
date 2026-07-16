import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { EditLinkButton } from "@/components/platform/edit-link-button";
import { UploadCompanyDocumentsForm } from "@/components/companies/upload-company-documents-form";
import { AssetExitSummary } from "@/components/assets/asset-exit-summary";
import { RecordAssetExitForm } from "@/components/assets/record-asset-exit-form";
import { getCompany, deleteCompany, deleteCompanyDocument } from "@/lib/actions/companies";
import { FileActions } from "@/components/platform/file-actions";
import { buildFileAccessContext } from "@/lib/files/download-access";
import { fileRequestKey } from "@/lib/files/download-types";
import type { FileKind } from "@/lib/files/href";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { ASSET_STATUS_LABELS, COMPANY_DOCUMENT_TYPE_LABELS } from "@/lib/labels";
import { formatDate, formatDecimalInput } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireModuleAccess("COMPANIES");
  const company = await getCompany(id);
  if (!company) notFound();

  const showUpload = canWrite(ctx, "COMPANIES");
  const docsByType = {
    REGISTRATION_COPY: company.documents.filter((d) => d.documentType === "REGISTRATION_COPY"),
    CHAMBER_COPY: company.documents.filter((d) => d.documentType === "CHAMBER_COPY"),
    FINANCIALS: company.documents.filter((d) => d.documentType === "FINANCIALS"),
    OTHER: company.documents.filter((d) => d.documentType === "OTHER"),
  };
  const fileRefs: Array<{ kind: FileKind; fileId: string }> = company.documents.map((doc) => ({
    kind: "company",
    fileId: doc.id,
  }));
  if (company.asset?.exit) {
    for (const doc of company.asset.exit.documents) {
      fileRefs.push({ kind: "asset-exit", fileId: doc.id });
    }
  }
  const fileAccess = await buildFileAccessContext(ctx, fileRefs);

  return (
    <>
      <PlatformHeader title={company.name} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/companies">Back to Companies</Link>
          </Button>
          {company.assetId ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={"/assets/" + company.assetId}>View in Assets</Link>
            </Button>
          ) : null}
          {showUpload ? (
            <>
              <EditLinkButton href={"/companies/" + company.id + "/edit"} />
              <DeleteEntryButton
                itemId={company.id}
                itemLabel={company.name}
                deleteAction={deleteCompany}
                redirectTo="/companies"
                title="Delete company?"
                description="This will permanently delete the company, linked asset, owners, and all uploaded documents."
              />
            </>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Registration Details</CardTitle>
              <CardDescription>{company.registrationNumber}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Detail label="Registration Date" value={formatDate(company.registrationDate)} />
              <Detail label="Registration Expiry" value={formatDate(company.registrationExpiryDate)} />
              <Detail label="Entity" value={company.entity.name} />
              <Detail label="Status" value={<Badge variant="secondary">{ASSET_STATUS_LABELS[company.status] ?? company.status}</Badge>} />
              {company.notes ? (
                <div className="sm:col-span-2">
                  <Detail label="Notes" value={company.notes} />
                </div>
              ) : null}
            </CardContent>
          </Card>
          {showUpload ? <UploadCompanyDocumentsForm companyId={company.id} /> : null}
        </div>

        {showUpload && company.assetId && company.status !== "EXITED" && !company.asset?.exit ? (
          <RecordAssetExitForm
            assetId={company.assetId}
            assetName={company.name}
            currency={company.asset?.currency ?? "OMR"}
            acquisitionCost={formatDecimalInput(company.asset?.acquisitionCost)}
            redirectTo={"/companies/" + company.id}
          />
        ) : null}

        {company.asset?.exit && company.assetId ? (
          <AssetExitSummary
            exit={company.asset.exit}
            assetId={company.assetId}
            showActions={showUpload}
            canAssignProceeds={showUpload}
          />
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Owners</CardTitle>
            <CardDescription>{company.owners.length} owner{company.owners.length === 1 ? "" : "s"}</CardDescription>
          </CardHeader>
          <CardContent>
            {company.owners.length === 0 ? (
              <p className="text-sm text-muted-foreground">No owners recorded.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {company.owners.map((owner) => (
                  <div key={owner.id} className="rounded-lg border p-4">
                    <p className="font-medium">{owner.name}</p>
                    {owner.ownershipPct != null ? (
                      <p className="text-sm text-muted-foreground">Ownership: {owner.ownershipPct.toString()}%</p>
                    ) : null}
                    {owner.email ? <p className="text-sm">{owner.email}</p> : null}
                    {owner.phone ? <p className="text-sm">{owner.phone}</p> : null}
                    {owner.address ? <p className="text-sm text-muted-foreground">{owner.address}</p> : null}
                    {owner.notes ? <p className="mt-2 text-sm">{owner.notes}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>CEO</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Detail label="Name" value={company.ceoName} />
              <Detail label="Email" value={company.ceoEmail} />
              <Detail label="Phone" value={company.ceoPhone} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Management</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Detail label="Contact Name" value={company.managementContactName} />
              <Detail label="Email" value={company.managementEmail} />
              <Detail label="Phone" value={company.managementPhone} />
              {company.managementNotes ? <Detail label="Details" value={company.managementNotes} /> : null}
            </CardContent>
          </Card>
        </div>

        {(["REGISTRATION_COPY", "CHAMBER_COPY", "FINANCIALS", "OTHER"] as const).map((type) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle>{COMPANY_DOCUMENT_TYPE_LABELS[type]}</CardTitle>
              <CardDescription>
                {docsByType[type].length} document{docsByType[type].length === 1 ? "" : "s"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {docsByType[type].length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents uploaded.</p>
              ) : (
                <ul className="space-y-2">
                  {docsByType[type].map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between gap-4 text-sm">
                      <div>
                        <p className="font-medium">{doc.label ?? doc.fileName}</p>
                        <p className="text-muted-foreground">
                          {doc.fileName} - {formatDate(doc.createdAt)}
                        </p>
                      </div>
                      <FileActions
                        kind="company"
                        fileId={doc.id}
                        fileName={doc.label ?? doc.fileName}
                        isSuperAdmin={fileAccess.isSuperAdmin}
                        requestStatus={fileAccess.downloadRequestStatuses[fileRequestKey("company", doc.id)]}
                        compact
                      />
                      {showUpload ? (
                        <DeleteEntryButton
                          itemId={doc.id}
                          itemLabel={doc.label ?? doc.fileName}
                          deleteAction={deleteCompanyDocument}
                          title="Delete document?"
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </main>
    </>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode | string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{value ?? "-"}</div>
    </div>
  );
}
