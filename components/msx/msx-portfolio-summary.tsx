import { formatDate, formatMoney } from "@/lib/format";
import type { MsxPortfolioSummary } from "@/lib/data/msx-portfolio";
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

export function MsxPortfolioSummaryCards({ summary }: { summary: MsxPortfolioSummary | null }) {
  if (!summary) {
    return (
      <p className="text-sm text-muted-foreground">
        Select an entity and upload brokerage reports to begin tracking your MSX portfolio.
      </p>
    );
  }

  const currency = summary.currency;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryMetric
        label="Market Value"
        value={formatMoney(summary.totalMarketValue, currency)}
        detail={summary.lastUpdated ? `Updated ${formatDate(summary.lastUpdated)}` : undefined}
      />
      <SummaryMetric
        label="Cost Basis"
        value={formatMoney(summary.totalCostBasis, currency)}
        detail={`${summary.entityName} · MSX`}
      />
      <SummaryMetric
        label="Unrealised P&L"
        value={formatMoney(summary.totalUnrealisedPnl, currency)}
      />
      <SummaryMetric
        label="Holdings"
        value={summary.holdingCount.toString()}
        detail={`Across ${summary.brokerCount} broker${summary.brokerCount === 1 ? "" : "s"}`}
      />
    </div>
  );
}
