export type AssistantChartType = "bar" | "line" | "pie" | "donut";

export type AssistantChartPoint = {
  label: string;
  value: number;
  color?: string;
};

export type AssistantChartSeries = {
  name: string;
  points: AssistantChartPoint[];
};

export type AssistantChart = {
  type: AssistantChartType;
  title: string;
  subtitle?: string;
  unit?: "omr" | "percent" | "count";
  series: AssistantChartSeries[];
};

export type AssistantCitation = {
  label: string;
  href: string;
  id?: string;
};

export function citation(label: string, href: string, id?: string): AssistantCitation {
  return id ? { label, href, id } : { label, href };
}

export function isAssistantChart(value: unknown): value is AssistantChart {
  if (!value || typeof value !== "object") return false;
  const chart = value as AssistantChart;
  return (
    typeof chart.title === "string" &&
    ["bar", "line", "pie", "donut"].includes(chart.type) &&
    Array.isArray(chart.series)
  );
}

export function isAssistantCitation(value: unknown): value is AssistantCitation {
  if (!value || typeof value !== "object") return false;
  const item = value as AssistantCitation;
  return typeof item.label === "string" && typeof item.href === "string";
}

export function extractChartsFromToolOutput(output: unknown): AssistantChart[] {
  if (!output || typeof output !== "object") return [];
  const record = output as Record<string, unknown>;
  const charts: AssistantChart[] = [];
  if (isAssistantChart(record.chart)) charts.push(record.chart);
  if (Array.isArray(record.charts)) {
    for (const item of record.charts) {
      if (isAssistantChart(item)) charts.push(item);
    }
  }
  return charts;
}

export function extractCitationsFromToolOutput(output: unknown): AssistantCitation[] {
  if (!output || typeof output !== "object") return [];
  const record = output as Record<string, unknown>;
  if (!Array.isArray(record.citations)) return [];
  const citations: AssistantCitation[] = [];
  const seen = new Set<string>();
  for (const item of record.citations) {
    if (!isAssistantCitation(item)) continue;
    const key = `${item.href}::${item.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    citations.push(item);
  }
  return citations;
}
