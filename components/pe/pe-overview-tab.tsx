import { PE_STAGE_LABELS, PE_STATUS_LABELS } from "@/lib/labels";
import { formatDate, formatMoney } from "@/lib/format";
import type { SerializedPeCompany } from "@/lib/pe/serialize";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PeDetailField } from "@/components/pe/pe-detail-field";

export function PeOverviewTab({ company }: { company: SerializedPeCompany }) {
  const currency = company.reportingCurrency;

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Invested</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatMoney(company.totals.totalInvested, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Latest Fair Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {company.totals.latestFairValue != null
                ? formatMoney(company.totals.latestFairValue, currency)
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Distributions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatMoney(company.totals.totalDistributed, currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Investments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{company.investments.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Profile</CardTitle>
          <CardDescription>{company.entityName}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PeDetailField label="Trading Name" value={company.tradingName} />
          <PeDetailField label="Country" value={company.country} />
          <PeDetailField label="Legal Entity" value={company.legalEntityType} />
          <PeDetailField label="Sector" value={company.sector} />
          <PeDetailField
            label="Stage"
            value={<Badge variant="outline">{PE_STAGE_LABELS[company.stage] ?? company.stage}</Badge>}
          />
          <PeDetailField
            label="Status"
            value={<Badge variant="secondary">{PE_STATUS_LABELS[company.status] ?? company.status}</Badge>}
          />
          <PeDetailField label="Reporting Currency" value={company.reportingCurrency} />
          <PeDetailField label="Risk Rating" value={company.riskRating?.toString()} />
          {company.notes ? (
            <div className="sm:col-span-2 lg:col-span-3">
              <PeDetailField label="Notes" value={company.notes} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {company.valuations[0] ? (
        <Card>
          <CardHeader>
            <CardTitle>Latest Valuation</CardTitle>
            <CardDescription>{formatDate(company.valuations[0].valuationDate)}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <PeDetailField
              label="Stake Fair Value"
              value={formatMoney(company.valuations[0].stakeFairValueReporting, currency)}
            />
            <PeDetailField
              label="Post-Money"
              value={formatMoney(company.valuations[0].postMoneyReporting, currency)}
            />
            <PeDetailField label="Method" value={company.valuations[0].method} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
