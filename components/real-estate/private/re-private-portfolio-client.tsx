"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  PrivatePortfolioSummary,
  PrivatePropertyListRow,
} from "@/lib/data/private-real-estate";
import { formatOmr } from "@/lib/format";
import { RE_PROPERTY_STATUS_LABELS } from "@/lib/labels";

export function RePrivatePortfolioClient({
  properties,
  summary,
  canEdit,
  entities,
  entityId,
}: {
  properties: PrivatePropertyListRow[];
  summary: PrivatePortfolioSummary;
  canEdit: boolean;
  entities: { id: string; name: string }[];
  entityId?: string;
}) {
  return (
    <div className="space-y-4">
      {entities.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {entities.map((entity) => (
            <Button
              key={entity.id}
              variant={entity.id === entityId ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link href={`/real-estate/private?entity=${entity.id}`}>{entity.name}</Link>
            </Button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Villas" value={summary.totalProperties.toString()} />
        <SummaryCard label="Total Valuation" value={formatOmr(summary.totalValuationOmr)} />
        <SummaryCard
          label="Monthly Running Costs"
          value={formatOmr(summary.totalMonthlyRunningCostOmr)}
        />
        <SummaryCard label="Household Staff" value={summary.totalStaff.toString()} />
      </div>

      <form className="flex flex-wrap items-center gap-2" method="get">
        {entityId ? <input type="hidden" name="entity" value={entityId} /> : null}
        <Input name="search" placeholder="Search villas…" className="w-56" />
        <Button type="submit" variant="secondary" size="sm">
          Search
        </Button>
      </form>

      {properties.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No private villas registered yet.
            {canEdit ? (
              <>
                {" "}
                <Link href="/real-estate/private/new" className="text-primary underline">
                  Add a family villa
                </Link>
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => (
            <Link key={property.id} href={`/real-estate/private/${property.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{property.name}</CardTitle>
                    {property.ownerDiscrepancy ? (
                      <Badge variant="destructive">Owner mismatch</Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {[property.area, property.wilayat, property.governorate]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valuation</span>
                    <span>{formatOmr(property.currentValuationOmr ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Running costs / mo</span>
                    <span>{formatOmr(property.monthlyRunningCostOmr)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Staff</span>
                    <span>{property.staffCount}</span>
                  </div>
                  <Badge variant="outline">
                    {RE_PROPERTY_STATUS_LABELS[property.status] ?? property.status}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <CardTitle className="text-xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
