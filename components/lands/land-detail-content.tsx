"use client";

import Link from "next/link";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { UploadLandDocumentsForm } from "@/components/lands/upload-land-documents-form";
import { RecordLandSaleForm } from "@/components/lands/record-land-sale-form";
import { AssetExitSummary } from "@/components/assets/asset-exit-summary";
import { UploadLandSaleDocumentsForm } from "@/components/lands/upload-land-sale-documents-form";
import { deleteLandDocument, deleteLandSaleDocument } from "@/lib/actions/lands";
import { fileHref, type FileKind } from "@/lib/files/href";
import {
  ASSET_STATUS_LABELS,
  LAND_LOCATION_TYPE_LABELS,
  LAND_SALE_DOCUMENT_TYPE_LABELS,
  LAND_USE_LABELS,
} from "@/lib/labels";
import {
  formatLandLocation,
  getLandDocumentTypeLabels,
  getLandReferenceFieldLabels,
  isInternationalLand,
} from "@/lib/lands/location";
import { formatMoney, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export type LandDetailData = {
  id: string;
  name: string;
  locationType: string;
  country: string;
  governorate: string | null;
  wilayat: string | null;
  region: string | null;
  city: string | null;
  village: string | null;
  plotNumber: string | null;
  krookiNumber: string | null;
  mulkiaNumber: string | null;
  landUse: string | null;
  areaSqm: { toString(): string } | null;
  coordinates: string | null;
  registeredHolder: string | null;
  registeredHolders: {
    id: string;
    name: string;
    ownershipPct: { toString(): string } | null;
    email: string | null;
    phone: string | null;
    notes: string | null;
  }[];
  ownershipPct: { toString(): string };
  status: string;
  acquisitionDate: Date | string | null;
  acquisitionCost: { toString(): string } | null;
  currentValue: { toString(): string } | null;
  currency: string;
  notes: string | null;
  assetId: string | null;
  asset?: {
    id: string;
    exit: {
      id: string;
      exitType: string;
      exitDate: Date | string;
      proceeds: { toString(): string } | null;
      currency: string;
      counterparty: string | null;
      acquisitionCost: { toString(): string } | null;
      realizedGain: { toString(): string } | null;
      realizedGainPct: { toString(): string } | null;
      recordCashInflow: boolean;
      notes: string | null;
      landSaleId: string | null;
      documents: {
        id: string;
        documentType: string;
        label: string | null;
        fileName: string;
        fileUrl: string;
        createdAt: Date | string;
      }[];
    } | null;
  } | null;
  entity: { name: string };
  documents: {
    id: string;
    documentType: string;
    label: string | null;
    fileName: string;
    fileUrl: string;
    createdAt: Date | string;
  }[];
  sale: {
    id: string;
    saleDate: Date | string;
    soldTo: string;
    saleAmount: { toString(): string };
    currency: string;
    notes: string | null;
    documents: {
      id: string;
      documentType: string;
      label: string | null;
      fileName: string;
      fileUrl: string;
      createdAt: Date | string;
    }[];
  } | null;
};

export function LandDetailContent({
  land,
  showActions = false,
  compact = false,
}: {
  land: LandDetailData;
  showActions?: boolean;
  compact?: boolean;
}) {
  const international = isInternationalLand(land);
  const docLabels = getLandDocumentTypeLabels(international);
  const refLabels = getLandReferenceFieldLabels(international);
  const docsByType = {
    KROOKI: land.documents.filter((d) => d.documentType === "KROOKI"),
    MULKIA: land.documents.filter((d) => d.documentType === "MULKIA"),
    OTHER: land.documents.filter((d) => d.documentType === "OTHER"),
  };

  const saleDocsByType = land.sale
    ? {
        POWER_OF_ATTORNEY: land.sale.documents.filter((d) => d.documentType === "POWER_OF_ATTORNEY"),
        SPA: land.sale.documents.filter((d) => d.documentType === "SPA"),
        BUYER_ID: land.sale.documents.filter((d) => d.documentType === "BUYER_ID"),
        OTHER: land.sale.documents.filter((d) => d.documentType === "OTHER"),
      }
    : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className={compact ? "pb-3" : undefined}>
          <CardTitle>Parcel Details</CardTitle>
          <CardDescription>
            {formatLandLocation(land)}
            {international ? " · " + LAND_LOCATION_TYPE_LABELS.INTERNATIONAL : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Detail label="Country" value={land.country} />
          {international ? (
            <>
              <Detail label="City" value={land.city} />
              <Detail label="State / Region" value={land.region} />
            </>
          ) : (
            <>
              <Detail label="Governorate" value={land.governorate} />
              <Detail label="Wilayat" value={land.wilayat} />
            </>
          )}
          <Detail label="Area / Village" value={land.village} />
          <Detail label="Plot Number" value={land.plotNumber} />
          <Detail label={refLabels.krooki} value={land.krookiNumber} />
          <Detail label={refLabels.mulkia} value={land.mulkiaNumber} />
          <Detail
            label="Land Use"
            value={land.landUse ? LAND_USE_LABELS[land.landUse] ?? land.landUse : null}
          />
          <Detail label="Area" value={land.areaSqm ? land.areaSqm.toString() + " sqm" : null} />
          <Detail label="Coordinates" value={land.coordinates} />
          <Detail label="Entity" value={land.entity.name} />
          <Detail label="Ownership" value={land.ownershipPct.toString() + "%"} />
          <Detail
            label="Status"
            value={
              <Badge variant="secondary">{ASSET_STATUS_LABELS[land.status] ?? land.status}</Badge>
            }
          />
          <Detail label="Acquisition Date" value={formatDate(land.acquisitionDate)} />
          <Detail label="Acquisition Cost" value={formatMoney(land.acquisitionCost, land.currency)} />
          <Detail label="Current Value" value={formatMoney(land.currentValue, land.currency)} />
          {land.notes ? (
            <div className="sm:col-span-2">
              <Detail label="Notes" value={land.notes} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className={compact ? "pb-3" : undefined}>
          <CardTitle>Registered Holders</CardTitle>
          <CardDescription>
            {land.registeredHolders.length > 0
              ? land.registeredHolders.length + " holder" + (land.registeredHolders.length === 1 ? "" : "s") + " on title"
              : land.registeredHolder
                ? "Legacy record — edit to add structured holder details"
                : "No registered holders recorded"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {land.registeredHolders.length > 0 ? (
            <div className="space-y-3">
              {land.registeredHolders.map((holder) => (
                <div key={holder.id} className="rounded-lg border p-4">
                  <p className="font-medium">{holder.name}</p>
                  {holder.ownershipPct != null ? (
                    <p className="text-sm text-muted-foreground">
                      Title share: {holder.ownershipPct.toString()}%
                    </p>
                  ) : null}
                  {holder.email ? <p className="text-sm">{holder.email}</p> : null}
                  {holder.phone ? <p className="text-sm">{holder.phone}</p> : null}
                  {holder.notes ? <p className="mt-2 text-sm">{holder.notes}</p> : null}
                </div>
              ))}
            </div>
          ) : land.registeredHolder ? (
            <p className="text-sm">{land.registeredHolder}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No registered holders recorded.</p>
          )}
        </CardContent>
      </Card>

      {land.sale ? (
        <Card>
          <CardHeader>
            <CardTitle>Sale Record</CardTitle>
            <CardDescription>Sold to {land.sale.soldTo}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Detail label="Sale Date" value={formatDate(land.sale.saleDate)} />
            <Detail label="Sold To" value={land.sale.soldTo} />
            <Detail label="Sale Amount" value={formatMoney(land.sale.saleAmount, land.sale.currency)} />
            {land.sale.notes ? (
              <div className="sm:col-span-2">
                <Detail label="Sale Notes" value={land.sale.notes} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : showActions ? (
        <RecordLandSaleForm landParcelId={land.id} landName={land.name} currency={land.currency} />
      ) : null}

      {land.asset?.exit && land.assetId ? (
        <AssetExitSummary exit={land.asset.exit} assetId={land.assetId} showActions={showActions} />
      ) : null}

      {showActions && !land.sale ? (
        <UploadLandDocumentsForm landParcelId={land.id} international={international} />
      ) : null}

      {showActions && land.sale ? (
        <UploadLandSaleDocumentsForm landParcelId={land.id} />
      ) : null}

      <Separator />

      {(["KROOKI", "MULKIA", "OTHER"] as const).map((type) => (
        <DocumentSection
          key={type}
          kind="land"
          title={docLabels[type]}
          documents={docsByType[type]}
          showActions={showActions}
          deleteAction={deleteLandDocument}
        />
      ))}

      {land.sale && saleDocsByType
        ? (["POWER_OF_ATTORNEY", "SPA", "BUYER_ID", "OTHER"] as const).map((type) => (
            <DocumentSection
              key={"sale-" + type}
              kind="land-sale"
              title={LAND_SALE_DOCUMENT_TYPE_LABELS[type]}
              documents={saleDocsByType[type]}
              showActions={showActions}
              deleteAction={deleteLandSaleDocument}
            />
          ))
        : null}

      {!compact ? (
        <div className="flex flex-wrap gap-2">
          {land.assetId ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={"/assets/" + land.assetId}>View in Assets</Link>
            </Button>
          ) : null}
          {showActions ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={"/lands/" + land.id + "/edit"}>Edit Land</Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function DocumentSection({
  kind,
  title,
  documents,
  showActions,
  deleteAction,
}: {
  kind: FileKind;
  title: string;
  documents: LandDetailData["documents"];
  showActions: boolean;
  deleteAction: (id: string) => Promise<void>;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          {documents.length} document{documents.length === 1 ? "" : "s"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents uploaded.</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{doc.label ?? doc.fileName}</p>
                  <p className="truncate text-muted-foreground">
                    {doc.fileName} · {formatDate(doc.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="outline" size="sm" asChild>
                    <a href={fileHref(kind, doc.id)} target="_blank" rel="noopener noreferrer">
                      Open
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={fileHref(kind, doc.id)} download={doc.fileName}>
                      Download
                    </a>
                  </Button>
                  {showActions ? (
                    <DeleteEntryButton
                      itemId={doc.id}
                      itemLabel={doc.label ?? doc.fileName}
                      deleteAction={deleteAction}
                      title="Delete document?"
                    />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode | string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{value ?? "—"}</div>
    </div>
  );
}
