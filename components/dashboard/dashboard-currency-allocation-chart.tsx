"use client";

import { Cell, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { CurrencyAllocationSlice } from "@/lib/data/dashboard";
import { formatMoney, formatOmr } from "@/lib/format";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

type DashboardCurrencyAllocationChartProps = {
  slices: CurrencyAllocationSlice[];
  totalOmr: number;
};

export function DashboardCurrencyAllocationChart({
  slices,
  totalOmr,
}: DashboardCurrencyAllocationChartProps) {
  if (slices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No asset values recorded yet. Register assets, lands, or cars to populate this view.
      </p>
    );
  }

  const chartConfig = slices.reduce<ChartConfig>((config, slice, index) => {
    config[slice.currency] = {
      label: slice.currency,
      color: CHART_COLORS[index % CHART_COLORS.length],
    };
    return config;
  }, {});

  const chartData = slices.map((slice) => ({
    currency: slice.currency,
    amountNative: slice.amountNative,
    value: slice.amountOmr,
    percentage: slice.percentage,
    fill: `var(--color-${slice.currency})`,
  }));

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        <div className="relative mx-auto w-full max-w-[280px]">
          <ChartContainer
            config={chartConfig}
            className="aspect-square h-[260px] w-full"
            aria-label="Currency allocation donut chart"
          >
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value, _name, item) => {
                      const payload = item.payload as {
                        currency: string;
                        amountNative: number;
                        percentage: number;
                      };
                      return (
                        <div className="flex w-full flex-col gap-1">
                          <div className="flex w-full items-center justify-between gap-4">
                            <span className="font-medium">{payload.currency}</span>
                            <span className="font-mono font-medium">
                              {payload.percentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex w-full items-center justify-between gap-4 text-muted-foreground">
                            <span>{formatMoney(payload.amountNative, payload.currency)}</span>
                            <span className="font-mono">{formatOmr(Number(value))}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                }
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="currency"
                innerRadius={68}
                outerRadius={100}
                strokeWidth={2}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.currency} fill={entry.fill} />
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
            <li key={slice.currency} className="flex items-center justify-between gap-4 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  aria-hidden
                />
                <span className="truncate font-medium">{slice.currency}</span>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-medium">{formatMoney(slice.amountNative, slice.currency)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatOmr(slice.amountOmr)} · {slice.percentage.toFixed(1)}%
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-muted-foreground">
        Percentages are weighted by OMR equivalent using the latest available FX rates.
      </p>
    </div>
  );
}
