import { formatOmr } from "@/lib/format";
import type { RePortfolioSummary } from "@/lib/data/real-estate";
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

function formatPct(value: number | null): string {
  if (value == null) return "—";
  return `${value.toFixed(1)}%`;
}

export function RePortfolioSummaryCards({ summary }: { summary: RePortfolioSummary | null }) {
  if (!summary) {
    return (
      <p className="text-sm text-muted-foreground">
        Add properties to begin tracking your real estate portfolio.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <SummaryMetric
        label="Properties"
        value={summary.totalProperties.toString()}
        detail="Active portfolio count"
      />
      <SummaryMetric
        label="Portfolio Value"
        value={formatOmr(summary.totalPortfolioValueOmr)}
        detail="Current valuations"
      />
      <SummaryMetric
        label="Occupancy"
        value={formatPct(summary.overallOccupancyPct)}
        detail="Across all units"
      />
      <SummaryMetric
        label="Gross Monthly Rent"
        value={formatOmr(summary.totalGrossMonthlyRentOmr)}
        detail="From active leases"
      />
      <SummaryMetric
        label="Overdue Rent"
        value={formatOmr(summary.totalOverdueRentOmr)}
        detail={summary.totalOverdueRentOmr > 0 ? "Requires follow-up" : "All current"}
      />
      <SummaryMetric
        label="Net Yield"
        value={formatPct(summary.netYieldPct)}
        detail="NOI / portfolio value"
      />
    </div>
  );
}
