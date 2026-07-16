import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { RePropertyHub } from "@/components/real-estate/re-property-hub";
import { ReAlertsBanner } from "@/components/real-estate/re-alerts-banner";
import { getProperty } from "@/lib/data/real-estate";
import { serializeReProperty } from "@/lib/real-estate/serialize";
import { buildFileAccessContext } from "@/lib/files/download-access";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import {
  RE_OWNERSHIP_STATUS_LABELS,
  RE_PROPERTY_STATUS_LABELS,
  RE_PROPERTY_TYPE_LABELS,
} from "@/lib/labels";
import { formatOmr } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const ctx = await requireModuleAccess("REAL_ESTATE");

  const property = await getProperty(id, ctx);
  if (!property) notFound();
  if (property.portfolioTrack === "PRIVATE") redirect(`/real-estate/private/${id}`);

  const serialized = serializeReProperty(property);
  const canEdit = canWrite(ctx, "REAL_ESTATE");
  const fileAccess = await buildFileAccessContext(
    ctx,
    property.documents.map((doc) => ({ kind: "re-property" as const, fileId: doc.id })),
  );
  const location = [property.area, property.wilayat, property.governorate]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <PlatformHeader title={property.name} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{property.name}</h2>
              <Badge variant="secondary">
                {RE_PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType}
              </Badge>
              <Badge variant="outline">
                {RE_PROPERTY_STATUS_LABELS[property.status] ?? property.status}
              </Badge>
              <Badge variant="outline">
                {RE_OWNERSHIP_STATUS_LABELS[property.ownershipStatus] ?? property.ownershipStatus}
              </Badge>
            </div>
            {location ? <p className="text-sm text-muted-foreground">{location}</p> : null}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>
                {property.metrics.occupiedUnits}/{property.metrics.totalUnits} units occupied
              </span>
              <span>{formatOmr(property.metrics.grossMonthlyRentOmr)}/mo rent</span>
              {property.metrics.grossYieldPct != null ? (
                <span>{property.metrics.grossYieldPct.toFixed(1)}% gross yield</span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {property.googleMapsUrl ? (
              <Button variant="outline" size="sm" asChild>
                <a href={property.googleMapsUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1 h-4 w-4" />
                  Maps
                </a>
              </Button>
            ) : null}
            {canEdit ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/real-estate/${id}/edit`}>Edit</Link>
              </Button>
            ) : null}
            <Button variant="outline" size="sm" asChild>
              <Link href="/real-estate">Back</Link>
            </Button>
          </div>
        </div>

        {property.alerts.length > 0 ? <ReAlertsBanner alerts={property.alerts} /> : null}

        <RePropertyHub property={serialized} canEdit={canEdit} defaultTab={tab} fileAccess={fileAccess} />
      </main>
    </>
  );
}
