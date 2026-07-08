import {
  RE_OWNERSHIP_STATUS_LABELS,
  RE_PROPERTY_STATUS_LABELS,
  RE_PROPERTY_TYPE_LABELS,
  RE_VALUATION_METHOD_LABELS,
} from "@/lib/labels";
import { formatDate, formatOmr } from "@/lib/format";
import type { SerializedReProperty } from "@/lib/real-estate/serialize";
import { ReAlertsBanner } from "@/components/real-estate/re-alerts-banner";
import { PeDetailField } from "@/components/pe/pe-detail-field";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function ReOverviewTab({ property }: { property: SerializedReProperty }) {
  const { metrics } = property;

  return (
    <div className="grid gap-4">
      {property.alerts.length > 0 ? (
        <ReAlertsBanner alerts={property.alerts} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Occupancy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {metrics.occupiedUnits}/{metrics.totalUnits}
            </p>
            <p className="text-xs text-muted-foreground">
              {metrics.occupancyRatePct.toFixed(1)}% occupied
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Rent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatOmr(metrics.grossMonthlyRentOmr)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatOmr(metrics.overdueRentOmr)}</p>
            <p className="text-xs text-muted-foreground">{metrics.overdueRentCount} payment(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valuation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {property.currentValuationOmr ? formatOmr(property.currentValuationOmr) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Property Details</CardTitle>
          <CardDescription>{property.entityName}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PeDetailField label="Type" value={RE_PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType} />
          <PeDetailField
            label="Status"
            value={
              <Badge variant="secondary">
                {RE_PROPERTY_STATUS_LABELS[property.status] ?? property.status}
              </Badge>
            }
          />
          <PeDetailField
            label="Ownership"
            value={RE_OWNERSHIP_STATUS_LABELS[property.ownershipStatus] ?? property.ownershipStatus}
          />
          <PeDetailField label="Governorate" value={property.governorate} />
          <PeDetailField label="Wilayat" value={property.wilayat} />
          <PeDetailField label="Area" value={property.area} />
          <PeDetailField label="Street Address" value={property.streetAddress} />
          <PeDetailField label="Plot Number" value={property.plotNumber} />
          <PeDetailField label="Built-up Area (m²)" value={property.builtUpAreaSqm} />
          <PeDetailField label="Land Area (m²)" value={property.landAreaSqm} />
          <PeDetailField label="Year Built" value={property.yearBuilt?.toString()} />
          <PeDetailField label="Purchase Date" value={formatDate(property.purchaseDate)} />
          <PeDetailField
            label="Purchase Price"
            value={property.purchasePriceOmr ? formatOmr(property.purchasePriceOmr) : null}
          />
          {property.notes ? (
            <div className="sm:col-span-2 lg:col-span-3">
              <PeDetailField label="Notes" value={property.notes} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Financial Summary (YTD)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PeDetailField label="Rent Collected" value={formatOmr(metrics.rentCollectedYtdOmr)} />
          <PeDetailField label="Expenses" value={formatOmr(metrics.totalExpensesYtdOmr)} />
          <PeDetailField label="Maintenance" value={formatOmr(metrics.totalMaintenanceCostYtdOmr)} />
          <PeDetailField label="Net Operating Income" value={formatOmr(metrics.netOperatingIncomeOmr)} />
          <PeDetailField
            label="Gross Yield"
            value={metrics.grossYieldPct != null ? `${metrics.grossYieldPct.toFixed(1)}%` : "—"}
          />
          <PeDetailField
            label="Net Yield"
            value={metrics.netYieldPct != null ? `${metrics.netYieldPct.toFixed(1)}%` : "—"}
          />
        </CardContent>
      </Card>

      {property.valuations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Valuation History</CardTitle>
            <CardDescription>{property.valuations.length} record(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Appraiser</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {property.valuations.map((valuation) => (
                  <TableRow key={valuation.id}>
                    <TableCell>{formatDate(valuation.valuationDate)}</TableCell>
                    <TableCell>{formatOmr(valuation.valuationOmr)}</TableCell>
                    <TableCell>
                      {valuation.method
                        ? (RE_VALUATION_METHOD_LABELS[valuation.method] ?? valuation.method)
                        : "—"}
                    </TableCell>
                    <TableCell>{valuation.appraiserName ?? valuation.appraiserCompany ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
