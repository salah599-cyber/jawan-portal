import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { EditLinkButton } from "@/components/platform/edit-link-button";
import { UploadCarDocumentsForm } from "@/components/cars/upload-car-documents-form";
import { AssetExitSummary } from "@/components/assets/asset-exit-summary";
import { RecordAssetExitForm } from "@/components/assets/record-asset-exit-form";
import { getCar, deleteCar, deleteCarDocument } from "@/lib/actions/cars";
import { fileHref } from "@/lib/files/href";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import {
  ASSET_STATUS_LABELS,
  VEHICLE_BODY_TYPE_LABELS,
  VEHICLE_CLASS_LABELS,
  VEHICLE_DOCUMENT_TYPE_LABELS,
  VEHICLE_FUEL_TYPE_LABELS,
} from "@/lib/labels";
import { formatMoney, formatDate, formatDecimalInput } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function formatPlate(plateCode: string | null, plateNumber: string) {
  return [plateCode, plateNumber].filter(Boolean).join(" ") || plateNumber;
}

export default async function CarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireModuleAccess("CARS");
  const car = await getCar(id);
  if (!car) notFound();

  const showUpload = canWrite(ctx, "CARS");
  const docsByType = {
    MULKIA: car.documents.filter((d) => d.documentType === "MULKIA"),
    INSURANCE: car.documents.filter((d) => d.documentType === "INSURANCE"),
    OTHER: car.documents.filter((d) => d.documentType === "OTHER"),
  };

  return (
    <>
      <PlatformHeader title={car.name} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/cars">Back to Cars</Link>
          </Button>
          {car.assetId ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={"/assets/" + car.assetId}>View in Assets</Link>
            </Button>
          ) : null}
          {showUpload ? (
            <>
              <EditLinkButton href={"/cars/" + car.id + "/edit"} />
              <DeleteEntryButton
                itemId={car.id}
                itemLabel={car.name}
                deleteAction={deleteCar}
                redirectTo="/cars"
                title="Delete vehicle?"
                description="This will permanently delete the vehicle, linked asset, and all uploaded documents."
              />
            </>
          ) : null}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Motor Vehicle License Details</CardTitle>
              <CardDescription>
                {formatPlate(car.plateCode, car.plateNumber)} — {car.wilayat}, {car.governorate}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Detail label="Make / Model" value={[car.make, car.model].filter(Boolean).join(" ")} />
              <Detail label="Model Year" value={car.modelYear?.toString()} />
              <Detail label="Color" value={car.color} />
              <Detail label="Vehicle Class" value={car.vehicleClass ? VEHICLE_CLASS_LABELS[car.vehicleClass] ?? car.vehicleClass : null} />
              <Detail label="Body Type" value={car.bodyType ? VEHICLE_BODY_TYPE_LABELS[car.bodyType] ?? car.bodyType : null} />
              <Detail label="Fuel Type" value={car.fuelType ? VEHICLE_FUEL_TYPE_LABELS[car.fuelType] ?? car.fuelType : null} />
              <Detail label="Mulkia Number" value={car.mulkiaNumber} />
              <Detail label="Chassis Number (VIN)" value={car.chassisNumber} />
              <Detail label="Engine Number" value={car.engineNumber} />
              <Detail label="Registered Owner" value={car.registeredOwner} />
              <Detail label="Registration Issue Date" value={formatDate(car.registrationIssueDate)} />
              <Detail label="Registration Expiry" value={formatDate(car.registrationExpiryDate)} />
              <Detail label="Insurance Company" value={car.insuranceCompany} />
              <Detail label="Insurance Policy Number" value={car.insurancePolicyNumber} />
              <Detail label="Insurance Expiry" value={formatDate(car.insuranceExpiryDate)} />
              <Detail label="Entity" value={car.entity.name} />
              <Detail label="Ownership" value={car.ownershipPct.toString() + "%"} />
              <Detail label="Status" value={<Badge variant="secondary">{ASSET_STATUS_LABELS[car.status] ?? car.status}</Badge>} />
              <Detail label="Acquisition Date" value={formatDate(car.acquisitionDate)} />
              <Detail label="Acquisition Cost" value={formatMoney(car.acquisitionCost, car.currency)} />
              <Detail label="Current Value" value={formatMoney(car.currentValue, car.currency)} />
              {car.notes ? (
                <div className="sm:col-span-2">
                  <Detail label="Notes" value={car.notes} />
                </div>
              ) : null}
            </CardContent>
          </Card>
          {showUpload ? <UploadCarDocumentsForm vehicleId={car.id} /> : null}
        </div>

        {showUpload && car.assetId && car.status !== "EXITED" && !car.asset?.exit ? (
          <RecordAssetExitForm
            assetId={car.assetId}
            assetName={car.name}
            currency={car.currency}
            acquisitionCost={formatDecimalInput(car.acquisitionCost)}
            redirectTo={"/cars/" + car.id}
          />
        ) : null}

        {car.asset?.exit && car.assetId ? (
          <AssetExitSummary exit={car.asset.exit} assetId={car.assetId} showActions={showUpload} />
        ) : null}

        {(["MULKIA", "INSURANCE", "OTHER"] as const).map((type) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle>{VEHICLE_DOCUMENT_TYPE_LABELS[type]}</CardTitle>
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
                      <Button variant="outline" size="sm" asChild>
                        <a href={fileHref("vehicle", doc.id)} target="_blank" rel="noopener noreferrer">
                          Open
                        </a>
                      </Button>
                      {showUpload ? (
                        <DeleteEntryButton
                          itemId={doc.id}
                          itemLabel={doc.label ?? doc.fileName}
                          deleteAction={deleteCarDocument}
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
