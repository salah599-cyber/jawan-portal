import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatOmr } from "@/lib/format";
import { formatRoiPct, roiTone } from "@/lib/portfolio/exit-metrics";
import type { ExitAnalyticsSummary } from "@/lib/data/dashboard";
import { cn } from "@/lib/utils";

function Metric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail?: string | null;
  tone?: string;
}) {
  return (
    <div className="space-y-1 rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-semibold tabular-nums", tone)}>{value}</p>
      {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

export function DashboardExitAnalyticsCards({
  analytics,
}: {
  analytics: ExitAnalyticsSummary;
}) {
  if (analytics.exitCount === 0) return null;

  const gainTone =
    analytics.totalRealizedGainOmr > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : analytics.totalRealizedGainOmr < 0
        ? "text-red-600 dark:text-red-400"
        : "text-foreground";

  const topCategory = analytics.byCategory[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exit Analytics</CardTitle>
        <CardDescription>
          Realized performance across assets, real estate, and private equity in the last 12 months
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Exits Recorded" value={analytics.exitCount.toString()} />
          <Metric
            label="Total Realized Gain"
            value={formatOmr(analytics.totalRealizedGainOmr)}
            detail={`Proceeds ${formatOmr(analytics.totalProceedsOmr)}`}
            tone={gainTone}
          />
          <Metric
            label="Average ROI"
            value={formatRoiPct(analytics.averageRoiPct)}
            tone={roiTone(analytics.averageRoiPct)}
          />
          <Metric
            label="Win Rate"
            value={analytics.winRatePct != null ? `${analytics.winRatePct.toFixed(0)}%` : "—"}
            detail={topCategory ? `Most active: ${topCategory.category}` : null}
          />
        </div>
      </CardContent>
    </Card>
  );
}
