"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PortfolioPerformance } from "@/lib/data/dashboard";
import {
  PERFORMANCE_PERIOD_LABELS,
  PERFORMANCE_PERIOD_SHORT_LABELS,
  type PerformancePeriod,
} from "@/lib/portfolio/performance";
import { formatOmr } from "@/lib/format";
import { cn } from "@/lib/utils";

const PERFORMANCE_PERIODS = Object.keys(PERFORMANCE_PERIOD_LABELS) as PerformancePeriod[];

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const period = performance.period;
  const periodLabel = PERFORMANCE_PERIOD_LABELS[period];
  const periodShortLabel = PERFORMANCE_PERIOD_SHORT_LABELS[period];

  function setPeriod(nextPeriod: PerformancePeriod) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPeriod === "month") {
      params.delete("period");
    } else {
      params.set("period", nextPeriod);
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Portfolio Performance</CardTitle>
          <CardDescription>Returns and top movers across your portfolio</CardDescription>
        </div>
        {hasPortfolio && performance.hasSufficientData ? (
          <Select value={period} onValueChange={(value) => setPeriod(value as PerformancePeriod)}>
            <SelectTrigger className="w-full sm:w-[180px]" aria-label="Performance period">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {PERFORMANCE_PERIODS.map((option) => (
                <SelectItem key={option} value={option}>
                  {PERFORMANCE_PERIOD_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
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
              label={`Return (${periodShortLabel})`}
              value={formatReturnPct(performance.periodReturnPct)}
              detail={
                performance.periodReturnOmr != null
                  ? formatOmr(performance.periodReturnOmr)
                  : null
              }
              tone={returnTone(performance.periodReturnPct)}
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
              label={`Best performer (${periodShortLabel})`}
              performer={performance.bestPerformer}
              positive
            />
            <AssetPerformerMetric
              label={`Worst performer (${periodShortLabel})`}
              performer={performance.worstPerformer}
              positive={false}
            />
          </div>
        )}
      </CardContent>
      {hasPortfolio && performance.hasSufficientData ? (
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            {periodLabel} returns use recorded valuations; public-market holdings share their
            portfolio baseline when earlier history is unavailable. Asset links open the module
            where each holding is managed.
          </p>
        </CardFooter>
      ) : null}
    </Card>
  );
}
