import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { UploadLandDocumentsForm } from "@/components/lands/upload-land-documents-form";
import { getLand, deleteLand, deleteLandDocument } from "@/lib/actions/lands";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { ASSET_STATUS_LABELS, LAND_DOCUMENT_TYPE_LABELS, LAND_USE_LABELS } from "@/lib/labels";
import { formatMoney, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireModuleAccess("LANDS");
  const land = await getLand(id);
  if (!land) notFound();

  const showUpload = canWrite(ctx, "LANDS");
  const docsByType = {
    KROOKI: land.documents.filter((d) => d.documentType === "KROOKI"),
    MULKIA: land.documents.filter((d) => d.documentType === "MULKIA"),
    OTHER: land.documents.filter((d) => d.documentType === "OTHER"),
  };

  return (
    <>
      <PlatformHeader title={land.name} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild><Link href="/lands">Back to Lands</Link></Button>
          {land.assetId ? <Button variant="outline" size="sm" asChild><Link href="/assets">View in Assets</Link></Button> : null}
          {showUpload ? (
            <DeleteEntryButton
              itemId={land.id}
              itemLabel={land.name}
              deleteAction={deleteLand}
              redirectTo="/lands"
              title="Delete land parcel?"
              description="This will permanently delete the land parcel, linked asset, and all uploaded documents."
            />
          ) : null}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Parcel Details</CardTitle>
              <CardDescription>{land.wilayat}, {land.governorate}{land.village ? " - " + land.village : ""}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Detail label="Plot Number" value={land.plotNumber} />
              <Detail label="Krooki Number" value={land.krookiNumber} />
              <Detail label="Mulkia Number" value={land.mulkiaNumber} />
              <Detail label="Land Use" value={land.landUse ? LAND_USE_LABELS[land.landUse] ?? land.landUse : null} />
              <Detail label="Area" value={land.areaSqm ? land.areaSqm.toString() + " sqm" : null} />
              <Detail label="Coordinates" value={land.coordinates} />
              <Detail label="Entity" value={land.entity.name} />
              <Detail label="Registered Holder" value={land.registeredHolder} />
              <Detail label="Ownership" value={land.ownershipPct.toString() + "%"} />
              <Detail label="Status" value={<Badge variant="secondary">{ASSET_STATUS_LABELS[land.status] ?? land.status}</Badge>} />
              <Detail label="Acquisition Date" value={formatDate(land.acquisitionDate)} />
              <Detail label="Acquisition Cost" value={formatMoney(land.acquisitionCost, land.currency)} />
              <Detail label="Current Value" value={formatMoney(land.currentValue, land.currency)} />
              {land.notes ? <div className="sm:col-span-2"><Detail label="Notes" value={land.notes} /></div> : null}
            </CardContent>
          </Card>
          {showUpload ? <UploadLandDocumentsForm landParcelId={land.id} /> : null}
        </div>
        {(["KROOKI", "MULKIA", "OTHER"] as const).map((type) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle>{LAND_DOCUMENT_TYPE_LABELS[type]}</CardTitle>
              <CardDescription>{docsByType[type].length} document{docsByType[type].length === 1 ? "" : "s"}</CardDescription>
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
                        <p className="text-muted-foreground">{doc.fileName} - {formatDate(doc.createdAt)}</p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">Open</a>
                      </Button>
                      {showUpload ? (
                        <DeleteEntryButton
                          itemId={doc.id}
                          itemLabel={doc.label ?? doc.fileName}
                          deleteAction={deleteLandDocument}
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
