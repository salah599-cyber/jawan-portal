"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { AssistantChart } from "@/lib/assistant/types";
import { formatOmr } from "@/lib/format";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function formatChartValue(value: number, unit?: AssistantChart["unit"]) {
  if (unit === "percent") return `${value.toFixed(1)}%`;
  if (unit === "count") return value.toLocaleString("en-OM");
  return formatOmr(value);
}

function buildChartConfig(points: { label: string }[]): ChartConfig {
  return points.reduce<ChartConfig>((config, point, index) => {
    config[point.label] = {
      label: point.label,
      color: CHART_COLORS[index % CHART_COLORS.length],
    };
    return config;
  }, {});
}

export function AssistantChartView({ chart }: { chart: AssistantChart }) {
  const primarySeries = chart.series[0];
  if (!primarySeries || primarySeries.points.length === 0) return null;

  const chartData = primarySeries.points.map((point, index) => ({
    label: point.label,
    value: point.value,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));
  const chartConfig = buildChartConfig(chartData);

  return (
    <div className="mt-3 rounded-lg border bg-muted/30 p-3">
      <div className="mb-2">
        <p className="text-sm font-medium">{chart.title}</p>
        {chart.subtitle ? (
          <p className="text-xs text-muted-foreground">{chart.subtitle}</p>
        ) : null}
      </div>

      {chart.type === "line" ? (
        <ChartContainer config={chartConfig} className="aspect-[16/9] h-[220px] w-full">
          <LineChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={12}
              tickFormatter={(value) => formatChartValue(Number(value), chart.unit)}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatChartValue(Number(value), chart.unit)}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ChartContainer>
      ) : null}

      {chart.type === "bar" ? (
        <ChartContainer config={chartConfig} className="aspect-[16/9] h-[220px] w-full">
          <BarChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={12}
              tickFormatter={(value) => formatChartValue(Number(value), chart.unit)}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatChartValue(Number(value), chart.unit)}
                />
              }
            />
            <Bar dataKey="value" radius={4}>
              {chartData.map((entry) => (
                <Cell key={entry.label} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      ) : null}

      {chart.type === "pie" || chart.type === "donut" ? (
        <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[240px] w-full max-w-[280px]">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatChartValue(Number(value), chart.unit)}
                />
              }
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="label"
              innerRadius={chart.type === "donut" ? 56 : 0}
              outerRadius={96}
              strokeWidth={2}
            >
              {chartData.map((entry) => (
                <Cell key={entry.label} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      ) : null}
    </div>
  );
}
