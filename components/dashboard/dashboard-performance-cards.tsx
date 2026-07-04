import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortfolioPerformance } from "@/lib/data/dashboard";
import { formatOmr } from "@/lib/format";
import { cn } from "@/lib/utils";

type DashboardPerformanceCardsProps = {
  performance: PortfolioPerformance;
  hasPortfolio: boolean;
};

function formatReturnPct(value: number | null): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function returnTone(value: number | null): string {
  if (value == null || value === 0) return "text-foreground";
  return value > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
}

function PerformanceMetric({
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

function AssetPerformerMetric({
  label,
  performer,
  positive,
}: {
  label: string;
  performer: PortfolioPerformance["bestPerformer"];
  positive: boolean;
}) {
  if (!performer) {
    return (
      <div className="space-y-1 rounded-lg border p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">—</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-2xl font-semibold tabular-nums",
          positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
        )}
      >
        {formatReturnPct(performer.returnPct)}
      </p>
      <Link
        href={performer.href}
        className="block truncate text-sm font-medium text-foreground hover:underline"
      >
        {performer.name}
      </Link>
    </div>
  );
}

export function DashboardPerformanceCards({
  performance,
  hasPortfolio,
}: DashboardPerformanceCardsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Performance</CardTitle>
        <CardDescription>Returns and top movers across your portfolio</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasPortfolio || !performance.hasSufficientData ? (
          <p className="text-sm text-muted-foreground">
            {!hasPortfolio
              ? "No asset values recorded yet. Register assets to start tracking performance."
              : "Performance tracking starts as values are updated."}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <PerformanceMetric
              label="Return this month"
              value={formatReturnPct(performance.monthReturnPct)}
              detail={
                performance.monthReturnOmr != null
                  ? formatOmr(performance.monthReturnOmr)
                  : null
              }
              tone={returnTone(performance.monthReturnPct)}
            />
            <PerformanceMetric
              label="Return YTD"
              value={formatReturnPct(performance.ytdReturnPct)}
              detail={
                performance.ytdReturnOmr != null ? formatOmr(performance.ytdReturnOmr) : null
              }
              tone={returnTone(performance.ytdReturnPct)}
            />
            <AssetPerformerMetric
              label="Best performing asset"
              performer={performance.bestPerformer}
              positive
            />
            <AssetPerformerMetric
              label="Worst performing asset"
              performer={performance.worstPerformer}
              positive={false}
            />
          </div>
        )}
      </CardContent>
      {hasPortfolio && performance.hasSufficientData ? (
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            Based on recorded valuations; acquisition cost used when earlier history is unavailable.
          </p>
        </CardFooter>
      ) : null}
    </Card>
  );
}
