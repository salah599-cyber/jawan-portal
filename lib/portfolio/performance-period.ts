import { startOfMonth } from "@/lib/calendar/date-ranges";

export type PerformancePeriod = "month" | "quarter" | "6m" | "year";

export const PERFORMANCE_PERIOD_LABELS: Record<PerformancePeriod, string> = {
  month: "This month",
  quarter: "This quarter",
  "6m": "Last 6 months",
  year: "Year to date",
};

export const PERFORMANCE_PERIOD_SHORT_LABELS: Record<PerformancePeriod, string> = {
  month: "MTD",
  quarter: "QTD",
  "6m": "6M",
  year: "YTD",
};

export const PERFORMANCE_PERIODS = Object.keys(
  PERFORMANCE_PERIOD_LABELS,
) as PerformancePeriod[];

export function parsePerformancePeriod(value?: string | null): PerformancePeriod {
  if (value === "quarter" || value === "6m" || value === "year") return value;
  return "month";
}

export function getPerformancePeriodStart(
  period: PerformancePeriod,
  now: Date = new Date(),
): Date {
  switch (period) {
    case "month":
      return startOfMonth(now);
    case "quarter": {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      return new Date(now.getFullYear(), quarterStartMonth, 1);
    }
    case "6m": {
      const date = new Date(now);
      date.setMonth(date.getMonth() - 6);
      date.setHours(0, 0, 0, 0);
      return date;
    }
    case "year":
      return new Date(now.getFullYear(), 0, 1);
  }
}
