import Link from "next/link";
import Image from "next/image";
import { Building2 } from "lucide-react";
import { deleteProperty } from "@/lib/actions/real-estate";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import type { RePropertyListRow } from "@/lib/data/real-estate";
import {
  RE_PROPERTY_STATUS_LABELS,
  RE_PROPERTY_TYPE_LABELS,
} from "@/lib/labels";
import { formatOmr } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function formatLocation(property: RePropertyListRow): string {
  const parts = [property.buildingName, property.area, property.wilayat, property.governorate].filter(
    Boolean,
  );
  return parts.join(", ") || "—";
}

function formatOccupancy(property: RePropertyListRow): string {
  if (property.numUnits === 0) return "—";
  return `${property.occupiedUnits}/${property.numUnits}`;
}

function marketValue(property: RePropertyListRow): number | null {
  return property.currentValuationOmr ?? property.purchasePriceOmr;
}

export function RePropertyCardGrid({
  properties,
  canEdit,
}: {
  properties: RePropertyListRow[];
  canEdit: boolean;
}) {
  if (properties.length === 0) {
    return <p className="text-sm text-muted-foreground">No properties found.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {properties.map((property) => (
        <Card key={property.id} className="relative h-full overflow-hidden">
          {canEdit ? (
            <div className="absolute right-2 top-2 z-10 rounded-md bg-background/90">
              <DeleteEntryButton
                itemId={property.id}
                itemLabel={property.name}
                deleteAction={deleteProperty}
                title="Delete property?"
                description={`This will permanently delete "${property.name}" and its linked net-worth asset.`}
              />
            </div>
          ) : null}
          <Link href={`/real-estate/${property.id}`} className="block h-full transition-colors hover:bg-muted/30">
            <div className="relative aspect-[16/10] overflow-hidden bg-muted">
              {property.primaryPhotoHref ? (
                <Image
                  src={property.primaryPhotoHref}
                  alt={property.name}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Building2 className="size-10 opacity-40" />
                </div>
              )}
              {property.overdueRentOmr > 0 ? (
                <Badge variant="destructive" className="absolute left-2 top-2">
                  Overdue {formatOmr(property.overdueRentOmr)}
                </Badge>
              ) : null}
            </div>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{property.name}</CardTitle>
                <Badge variant="secondary">
                  {RE_PROPERTY_STATUS_LABELS[property.status] ?? property.status}
                </Badge>
              </div>
              <CardDescription>
                {RE_PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType} ·{" "}
                {property.entityName}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Market value</p>
                <p className="font-medium">{formatOmr(marketValue(property))}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-medium">{formatLocation(property)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Occupancy</p>
                <p className="font-medium">{formatOccupancy(property)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monthly Rent</p>
                <p className="font-medium">{formatOmr(property.grossMonthlyRentOmr)}</p>
              </div>
            </CardContent>
          </Link>
        </Card>
      ))}
    </div>
  );
}
