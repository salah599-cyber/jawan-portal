import Link from "next/link";
import { RowActions } from "@/components/platform/row-actions";
import { deleteProperty } from "@/lib/actions/real-estate";
import type { RePropertyListRow } from "@/lib/data/real-estate";
import {
  RE_PROPERTY_STATUS_LABELS,
  RE_PROPERTY_TYPE_LABELS,
} from "@/lib/labels";
import { formatOmr } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatLocation(property: RePropertyListRow): string {
  const parts = [property.area, property.wilayat, property.governorate].filter(Boolean);
  return parts.join(", ") || "—";
}

export function RePropertyTable({
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Property</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Entity</TableHead>
          <TableHead>Units</TableHead>
          <TableHead className="text-right">Monthly Rent</TableHead>
          <TableHead className="text-right">Overdue</TableHead>
          <TableHead className="text-right">Yield</TableHead>
          <TableHead>Status</TableHead>
          {canEdit ? <TableHead className="w-[60px]">Actions</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {properties.map((property) => (
          <TableRow key={property.id}>
            <TableCell className="font-medium">
              <Link href={`/real-estate/${property.id}`} className="hover:underline">
                {property.name}
              </Link>
            </TableCell>
            <TableCell>
              {RE_PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType}
            </TableCell>
            <TableCell>{formatLocation(property)}</TableCell>
            <TableCell>{property.entityName}</TableCell>
            <TableCell>
              {property.occupiedUnits}/{property.numUnits}
            </TableCell>
            <TableCell className="text-right">{formatOmr(property.grossMonthlyRentOmr)}</TableCell>
            <TableCell className="text-right">
              {property.overdueRentOmr > 0 ? (
                <Badge variant="destructive">{formatOmr(property.overdueRentOmr)}</Badge>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell className="text-right">
              {property.grossYieldPct != null ? `${property.grossYieldPct.toFixed(1)}%` : "—"}
            </TableCell>
            <TableCell>
              <Badge variant="secondary">
                {RE_PROPERTY_STATUS_LABELS[property.status] ?? property.status}
              </Badge>
            </TableCell>
            {canEdit ? (
              <TableCell>
                <RowActions
                  editHref={`/real-estate/${property.id}/edit`}
                  itemId={property.id}
                  itemLabel={property.name}
                  deleteAction={deleteProperty}
                />
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
