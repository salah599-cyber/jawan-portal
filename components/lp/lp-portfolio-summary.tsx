import { formatDate, formatMoney, formatOmr } from "@/lib/format";
import type { LpPortfolioSummary } from "@/lib/data/lp-fund";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function SummaryMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}

export function LpPortfolioSummaryCards({ summary }: { summary: LpPortfolioSummary | null }) {
  if (!summary) {
    return (
      <p className="text-sm text-muted-foreground">
        Select an entity and add fund commitments to begin tracking LP investments.
      </p>
    );
  }

  const currency = summary.reportingCurrency;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryMetric
        label="Total Committed"
        value={formatMoney(summary.totalCommitted, currency)}
        detail={summary.lastUpdated ? `Updated ${formatDate(summary.lastUpdated)}` : undefined}
      />
      <SummaryMetric
        label="Latest NAV"
        value={formatMoney(summary.totalNav, currency)}
        detail={`${formatOmr(summary.totalNavOmr)} consolidated`}
      />
      <SummaryMetric
        label="Unfunded"
        value={formatMoney(summary.totalUnfunded, currency)}
        detail={`${formatMoney(summary.totalPaidIn, currency)} paid-in`}
      />
      <SummaryMetric
        label="Commitments"
        value={summary.commitmentCount.toString()}
        detail={`${summary.activeCount} active · ${summary.entityName}`}
      />
    </div>
  );
}
