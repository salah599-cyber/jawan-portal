"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { NetWorthTrend } from "@/lib/data/dashboard";
import { formatOmr } from "@/lib/format";
import { cn } from "@/lib/utils";

type PeriodMonths = 3 | 6 | 12;

const PERIOD_OPTIONS: { value: PeriodMonths; label: string }[] = [
  { value: 3, label: "3M" },
  { value: 6, label: "6M" },
  { value: 12, label: "12M" },
];

const chartConfig = {
  netWorthOmr: {
    label: "Net Worth",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function formatPeriodChange(first: number, last: number): { deltaOmr: number; deltaPct: number | null } {
  const deltaOmr = last - first;
  const deltaPct = first > 0 ? (deltaOmr / first) * 100 : null;
  return { deltaOmr, deltaPct };
}

function formatSignedOmr(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatOmr(Math.abs(value))}`;
}

function formatSignedPct(value: number | null): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

export function DashboardNetWorthTrendChart({ trend }: { trend: NetWorthTrend }) {
  const [period, setPeriod] = useState<PeriodMonths>(6);

  const visiblePoints = useMemo(() => {
    const count = period + 1;
    return trend.points.slice(-count);
  }, [period, trend.points]);

  const periodChange = useMemo(() => {
    if (visiblePoints.length < 2) return null;
    const first = visiblePoints[0]!.netWorthOmr;
    const last = visiblePoints[visiblePoints.length - 1]!.netWorthOmr;
    return formatPeriodChange(first, last);
  }, [visiblePoints]);

  const yDomain = useMemo(() => {
    const values = visiblePoints.map((point) => point.netWorthOmr);
    if (values.length === 0) return [0, 1] as [number, number];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = Math.max((max - min) * 0.1, max * 0.02, 1000);
    return [Math.max(0, min - padding), max + padding] as [number, number];
  }, [visiblePoints]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Net Worth Trend</CardTitle>
          <CardDescription>
            Portfolio minus liabilities over time — see whether wealth is moving in the right direction.
          </CardDescription>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Period</Label>
          <Select
            value={String(period)}
            onValueChange={(value) => setPeriod(Number(value) as PeriodMonths)}
          >
            <SelectTrigger size="sm" className="min-w-[6rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!trend.hasSufficientData ? (
          <p className="text-sm text-muted-foreground">
            Record asset valuations and liabilities to see net worth trend over time.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <p className="text-xs text-muted-foreground">Current net worth</p>
                <p className="text-2xl font-semibold tabular-nums">{formatOmr(trend.currentNetWorthOmr)}</p>
              </div>
              {periodChange ? (
                <div>
                  <p className="text-xs text-muted-foreground">Change over {period} months</p>
                  <p
                    className={cn(
                      "text-lg font-semibold tabular-nums",
                      periodChange.deltaOmr > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : periodChange.deltaOmr < 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-foreground",
                    )}
                  >
                    {formatSignedOmr(periodChange.deltaOmr)}{" "}
                    <span className="text-sm font-medium">({formatSignedPct(periodChange.deltaPct)})</span>
                  </p>
                </div>
              ) : null}
            </div>

            <ChartContainer config={chartConfig} className="aspect-[2.4/1] h-[260px] w-full">
              <LineChart data={visiblePoints} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={88}
                  domain={yDomain}
                  tickFormatter={(value) => formatOmr(Number(value))}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_value, payload) => {
                        const item = payload?.[0]?.payload as { label?: string } | undefined;
                        return item?.label ?? "";
                      }}
                      formatter={(value) => (
                        <span className="font-mono font-medium">{formatOmr(Number(value))}</span>
                      )}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="netWorthOmr"
                  stroke="var(--color-netWorthOmr)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--color-netWorthOmr)" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartContainer>
          </>
        )}
        <p className="text-xs text-muted-foreground">
          Based on recorded valuations and loan balances. FX at current rates.
        </p>
      </CardContent>
    </Card>
  );
}
