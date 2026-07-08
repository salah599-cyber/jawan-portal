import {
  LP_COMMITMENT_STATUS_LABELS,
  LP_FUND_STRATEGY_LABELS,
} from "@/lib/lp/constants";
import { formatDate, formatMoney } from "@/lib/format";
import type { SerializedLpCommitment } from "@/lib/lp/serialize";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PeDetailField } from "@/components/pe/pe-detail-field";

function formatMultiple(value: number | null): string {
  if (value == null) return "—";
  return `${value.toFixed(2)}x`;
}

function formatIrr(value: number | null): string {
  if (value == null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

export function LpOverviewTab({ commitment }: { commitment: SerializedLpCommitment }) {
  const currency = commitment.commitmentCurrency;
  const m = commitment.metrics;

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid-In Capital</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatMoney(m.paidInCapital, currency)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Unfunded {formatMoney(m.unfundedCommitment, currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Latest NAV</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {m.latestNav != null ? formatMoney(m.latestNav, currency) : "—"}
            </p>
            {m.latestNavDate ? (
              <p className="mt-1 text-xs text-muted-foreground">As of {formatDate(m.latestNavDate)}</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Distributions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatMoney(m.totalDistributions, currency)}</p>
            {m.recallableOutstanding > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {formatMoney(m.recallableOutstanding, currency)} recallable outstanding
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Carrying Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatMoney(m.carryingValue, currency)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">DPI</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatMultiple(m.dpi)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">RVPI</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatMultiple(m.rvpi)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">TVPI</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatMultiple(m.tvpi)}</p>
            {m.gpReportedTvpi != null ? (
              <p className="mt-1 text-xs text-muted-foreground">
                GP reported {formatMultiple(m.gpReportedTvpi)}
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net IRR</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatIrr(m.netIrr)}</p>
            {m.gpReportedIrr != null ? (
              <p className="mt-1 text-xs text-muted-foreground">
                GP reported {formatIrr(m.gpReportedIrr)}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Commitment Summary</CardTitle>
          <CardDescription>{commitment.entityName}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PeDetailField
            label="Committed"
            value={formatMoney(commitment.commitmentAmount, currency)}
          />
          <PeDetailField label="Commitment Date" value={formatDate(commitment.commitmentDate)} />
          <PeDetailField
            label="Status"
            value={
              <Badge variant="secondary">
                {LP_COMMITMENT_STATUS_LABELS[commitment.status] ?? commitment.status}
              </Badge>
            }
          />
          <PeDetailField
            label="Fund"
            value={commitment.fund.name}
          />
          <PeDetailField
            label="Strategy"
            value={LP_FUND_STRATEGY_LABELS[commitment.fund.strategy] ?? commitment.fund.strategy}
          />
          <PeDetailField label="GP" value={commitment.fund.gpManager?.name} />
          {commitment.ownershipPctOfFund ? (
            <PeDetailField label="Ownership % of Fund" value={`${commitment.ownershipPctOfFund}%`} />
          ) : null}
          {commitment.sideLetterNotes ? (
            <div className="sm:col-span-2 lg:col-span-3">
              <PeDetailField label="Side Letter Notes" value={commitment.sideLetterNotes} />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
