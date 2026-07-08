import { formatDate, formatMoney } from "@/lib/format";
import type { PePortfolioSummary } from "@/lib/data/pe-portfolio";
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

export function PePortfolioSummaryCards({ summary }: { summary: PePortfolioSummary | null }) {
  if (!summary) {
    return (
      <p className="text-sm text-muted-foreground">
        Select an entity and add portfolio companies to begin tracking your PE / VC investments.
      </p>
    );
  }

  const currency = summary.reportingCurrency;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryMetric
        label="Total Invested"
        value={formatMoney(summary.totalInvested, currency)}
        detail={summary.lastUpdated ? `Updated ${formatDate(summary.lastUpdated)}` : undefined}
      />
      <SummaryMetric
        label="Fair Value"
        value={formatMoney(summary.totalFairValue, currency)}
        detail={`${summary.entityName} · ${summary.activeCount} active`}
      />
      <SummaryMetric
        label="Unrealised Gain"
        value={formatMoney(summary.unrealisedGain, currency)}
        detail={`${summary.totalDistributed > 0 ? formatMoney(summary.totalDistributed, currency) + " distributed" : "No distributions yet"}`}
      />
      <SummaryMetric
        label="Portfolio Companies"
        value={summary.companyCount.toString()}
        detail={`${summary.activeCount} active · ${summary.companyCount - summary.activeCount} exited / written off`}
      />
    </div>
  );
}
