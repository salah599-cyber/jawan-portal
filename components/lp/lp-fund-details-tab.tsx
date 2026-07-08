import {
  LP_FUND_STATUS_LABELS,
  LP_FUND_STRATEGY_LABELS,
} from "@/lib/lp/constants";
import { formatDate, formatMoney } from "@/lib/format";
import type { SerializedLpCommitment } from "@/lib/lp/serialize";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PeDetailField } from "@/components/pe/pe-detail-field";

export function LpFundDetailsTab({ commitment }: { commitment: SerializedLpCommitment }) {
  const fund = commitment.fund;
  const currency = fund.currency;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{fund.name}</CardTitle>
        <CardDescription>External fund vehicle details</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <PeDetailField label="GP / Manager" value={fund.gpManager?.name} />
        <PeDetailField label="Country" value={fund.gpManager?.country} />
        <PeDetailField
          label="Website"
          value={
            fund.gpManager?.website ? (
              <a
                href={fund.gpManager.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {fund.gpManager.website}
              </a>
            ) : null
          }
        />
        <PeDetailField
          label="Strategy"
          value={
            <Badge variant="outline">
              {LP_FUND_STRATEGY_LABELS[fund.strategy] ?? fund.strategy}
            </Badge>
          }
        />
        <PeDetailField
          label="Status"
          value={
            <Badge variant="secondary">
              {LP_FUND_STATUS_LABELS[fund.status] ?? fund.status}
            </Badge>
          }
        />
        <PeDetailField label="Vintage Year" value={fund.vintageYear?.toString()} />
        <PeDetailField
          label="Fund Size"
          value={fund.fundSize ? formatMoney(fund.fundSize, currency) : null}
        />
        <PeDetailField label="Currency" value={currency} />
        <PeDetailField label="Fund Term" value={fund.fundTermYears ? `${fund.fundTermYears} years` : null} />
        <PeDetailField
          label="Investment Period End"
          value={fund.investmentPeriodEnd ? formatDate(fund.investmentPeriodEnd) : null}
        />
        {fund.notes ? (
          <div className="sm:col-span-2 lg:col-span-3">
            <PeDetailField label="Notes" value={fund.notes} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
