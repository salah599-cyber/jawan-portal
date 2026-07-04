"use client";

import { Cell, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { AllocationSlice } from "@/lib/data/dashboard";
import { formatOmr } from "@/lib/format";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

type DashboardAssetAllocationChartProps = {
  slices: AllocationSlice[];
  totalOmr: number;
};

export function DashboardAssetAllocationChart({
  slices,
  totalOmr,
}: DashboardAssetAllocationChartProps) {
  if (slices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No asset values recorded yet. Register assets, lands, or cars to populate this view.
      </p>
    );
  }

  const chartConfig = slices.reduce<ChartConfig>((config, slice, index) => {
    config[slice.category] = {
      label: slice.label,
      color: CHART_COLORS[index % CHART_COLORS.length],
    };
    return config;
  }, {});

  const chartData = slices.map((slice) => ({
    category: slice.category,
    label: slice.label,
    value: slice.amountOmr,
    percentage: slice.percentage,
    fill: `var(--color-${slice.category})`,
  }));

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-center">
      <div className="relative mx-auto w-full max-w-[280px]">
        <ChartContainer
          config={chartConfig}
          className="aspect-square h-[260px] w-full"
          aria-label="Asset allocation donut chart"
        >
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, _name, item) => {
                    const payload = item.payload as {
                      label: string;
                      percentage: number;
                    };
                    return (
                      <div className="flex w-full items-center justify-between gap-4">
                        <span>{payload.label}</span>
                        <span className="font-mono font-medium">
                          {formatOmr(Number(value))} ({payload.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    );
                  }}
                />
              }
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="category"
              innerRadius={68}
              outerRadius={100}
              strokeWidth={2}
            >
              {chartData.map((entry) => (
                <Cell key={entry.category} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-sm font-semibold">{formatOmr(totalOmr)}</p>
        </div>
      </div>

      <ul className="flex-1 space-y-3">
        {slices.map((slice, index) => (
          <li key={slice.category} className="flex items-center justify-between gap-4 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                aria-hidden
              />
              <span className="truncate font-medium">{slice.label}</span>
              <span className="shrink-0 text-muted-foreground">
                {slice.count} asset{slice.count === 1 ? "" : "s"}
              </span>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-medium">{formatOmr(slice.amountOmr)}</p>
              <p className="text-xs text-muted-foreground">{slice.percentage.toFixed(1)}%</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
