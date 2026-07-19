import { tool } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import type { AssistantChart } from "@/lib/assistant/types";
import { getDashboardSummary } from "@/lib/data/dashboard";
import { getCashSummary } from "@/lib/data/cash-management";
import { getPePortfolioSummary } from "@/lib/data/pe-portfolio";
import { getLpPortfolioSummary } from "@/lib/data/lp-fund";
import { getPortfolioSummary as getRealEstateSummary } from "@/lib/data/real-estate";
import { getExitAnalyticsSummary } from "@/lib/portfolio/exit-analytics";
import { getPortfolioRollup } from "@/lib/portfolio/rollup";
import { getNetWorthTrend } from "@/lib/portfolio/net-worth-trend";
import {
  getPortfolioPerformance,
  type PerformancePeriod,
} from "@/lib/portfolio/performance";
import { canAccess } from "@/lib/permissions/access";
import { loanEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";
import { convertToOmr, entityWhere } from "@/lib/reports/helpers";
import { ASSET_CATEGORY_LABELS } from "@/lib/labels";

const entityIdSchema = z
  .string()
  .optional()
  .describe("Optional legal entity ID to scope the query");

const periodSchema = z
  .enum(["1M", "3M", "6M", "1Y", "YTD"])
  .optional()
  .describe("Performance period (default YTD)");

function accessDenied(module: string) {
  return { error: `You do not have access to ${module} data.` };
}

function categoryLabel(category: string): string {
  return category.startsWith("custom:")
    ? category.slice("custom:".length)
    : (ASSET_CATEGORY_LABELS[category] ?? category);
}

function liabilitiesVsNetWorthChart(
  liabilitiesOmr: number,
  netWorthOmr: number,
): AssistantChart {
  return {
    type: "bar",
    title: "Liabilities vs Net Worth",
    unit: "omr",
    series: [
      {
        name: "OMR",
        points: [
          { label: "Liabilities", value: liabilitiesOmr },
          { label: "Net Worth", value: netWorthOmr },
        ],
      },
    ],
  };
}

function allocationChart(
  slices: { label: string; amountOmr: number; percentage: number }[],
): AssistantChart {
  return {
    type: "donut",
    title: "Asset Allocation",
    unit: "omr",
    series: [
      {
        name: "Allocation",
        points: slices.map((slice) => ({
          label: slice.label,
          value: slice.amountOmr,
        })),
      },
    ],
  };
}

function netWorthTrendChart(
  points: { label: string; netWorthOmr: number }[],
): AssistantChart | null {
  if (points.length < 2) return null;
  return {
    type: "line",
    title: "Net Worth Trend",
    subtitle: "Last 12 months",
    unit: "omr",
    series: [
      {
        name: "Net Worth",
        points: points.map((point) => ({
          label: point.label,
          value: point.netWorthOmr,
        })),
      },
    ],
  };
}

export function createAssistantTools(ctx: UserContext) {
  return {
    get_portfolio_summary: tool({
      description:
        "Get consolidated portfolio summary: portfolio value, liabilities, net worth, and debt-to-equity ratio in OMR.",
      inputSchema: z.object({ entityId: entityIdSchema }),
      execute: async ({ entityId }) => {
        if (!canAccess(ctx, "ASSETS")) return accessDenied("Assets");

        const rollup = await getPortfolioRollup(ctx, { entityId });
        const debtToEquity =
          rollup.netWorthTotalOmr > 0
            ? rollup.liabilityTotalOmr / rollup.netWorthTotalOmr
            : null;

        return {
          portfolioTotalOmr: rollup.portfolioTotalOmr,
          liabilityTotalOmr: rollup.liabilityTotalOmr,
          netWorthTotalOmr: rollup.netWorthTotalOmr,
          debtToEquityRatio: debtToEquity,
          debtToEquityNote:
            "Liabilities divided by net worth. Lower values indicate less leverage.",
          activeAssetCount: rollup.activeAssetCount,
          chart: liabilitiesVsNetWorthChart(
            rollup.liabilityTotalOmr,
            rollup.netWorthTotalOmr,
          ),
        };
      },
    }),

    get_asset_allocation: tool({
      description: "Get portfolio breakdown by asset category with percentages.",
      inputSchema: z.object({ entityId: entityIdSchema }),
      execute: async ({ entityId }) => {
        if (!canAccess(ctx, "ASSETS")) return accessDenied("Assets");

        const rollup = await getPortfolioRollup(ctx, { entityId });
        const slices = await Promise.all(
          [...rollup.categoryMap.entries()].map(async ([category, data]) => {
            let amountOmr = 0;
            for (const [currency, amount] of data.totals.entries()) {
              if (amount > 0) amountOmr += await convertToOmr(amount, currency);
            }
            return {
              category,
              label: categoryLabel(category),
              amountOmr,
              count: data.count,
              percentage:
                rollup.portfolioTotalOmr > 0
                  ? (amountOmr / rollup.portfolioTotalOmr) * 100
                  : 0,
            };
          }),
        );

        const filtered = slices
          .filter((slice) => slice.amountOmr > 0)
          .sort((a, b) => b.amountOmr - a.amountOmr);

        return {
          portfolioTotalOmr: rollup.portfolioTotalOmr,
          slices: filtered,
          chart: filtered.length > 0 ? allocationChart(filtered) : null,
        };
      },
    }),

    get_net_worth_trend: tool({
      description: "Get net worth trend over the last 12 months.",
      inputSchema: z.object({ entityId: entityIdSchema }),
      execute: async ({ entityId }) => {
        if (!canAccess(ctx, "ASSETS")) return accessDenied("Assets");

        const rollup = await getPortfolioRollup(ctx, { entityId });
        const trend = await getNetWorthTrend(ctx, rollup);
        if (!trend) {
          return { error: "Insufficient valuation history to compute net worth trend." };
        }

        const chart = netWorthTrendChart(trend.points);
        const first = trend.points[0];
        const last = trend.points[trend.points.length - 1];
        const changeOmr = last.netWorthOmr - first.netWorthOmr;
        const changePct = first.netWorthOmr > 0 ? (changeOmr / first.netWorthOmr) * 100 : null;

        return {
          hasSufficientData: trend.hasSufficientData,
          currentNetWorthOmr: trend.currentNetWorthOmr,
          changeOmr,
          changePct,
          points: trend.points,
          chart,
        };
      },
    }),

    get_portfolio_performance: tool({
      description:
        "Get portfolio return for a period and year-to-date, plus best and worst performers.",
      inputSchema: z.object({
        entityId: entityIdSchema,
        period: periodSchema,
      }),
      execute: async ({ entityId, period }) => {
        if (!canAccess(ctx, "ASSETS")) return accessDenied("Assets");

        const performance = await getPortfolioPerformance(ctx, {
          entityId,
          period: (period ?? "YTD") as PerformancePeriod,
        });

        return {
          period: performance.period,
          periodReturnPct: performance.periodReturnPct,
          periodReturnOmr: performance.periodReturnOmr,
          ytdReturnPct: performance.ytdReturnPct,
          ytdReturnOmr: performance.ytdReturnOmr,
          bestPerformer: performance.bestPerformer,
          worstPerformer: performance.worstPerformer,
          hasSufficientData: performance.hasSufficientData,
          topAssets: performance.assetRows.slice(0, 5).map((row) => ({
            name: row.name,
            returnPct: row.periodReturnPct,
            currentValueOmr: row.currentValueOmr,
          })),
        };
      },
    }),

    get_liabilities: tool({
      description: "List active liabilities and loans with outstanding balances and maturity dates.",
      inputSchema: z.object({ entityId: entityIdSchema }),
      execute: async ({ entityId }) => {
        if (!canAccess(ctx, "ASSETS")) return accessDenied("Assets");

        const liabilities = await db.liability.findMany({
          where: {
            ...entityWhere(entityId, loanEntityFilter(ctx)),
            status: "ACTIVE",
          },
          include: { entity: { select: { name: true } } },
          orderBy: [{ maturityDate: "asc" }, { name: "asc" }],
        });

        const rows = await Promise.all(
          liabilities.map(async (liability: (typeof liabilities)[number]) => {
            const outstanding =
              liability.outstandingBalance != null
                ? Number(liability.outstandingBalance.toString())
                : Number(liability.amount.toString());
            const outstandingOmr = await convertToOmr(outstanding, liability.currency);
            return {
              name: liability.name,
              entity: liability.entity.name,
              type: liability.type,
              lender: liability.lender,
              outstanding,
              outstandingOmr,
              currency: liability.currency,
              interestRate: liability.interestRate
                ? Number(liability.interestRate.toString())
                : null,
              maturityDate: liability.maturityDate?.toISOString().slice(0, 10) ?? null,
            };
          }),
        );

        const totalOmr = rows.reduce((sum: number, row: (typeof rows)[number]) => sum + row.outstandingOmr, 0);
        const byType = new Map<string, number>();
        for (const row of rows) {
          byType.set(row.type, (byType.get(row.type) ?? 0) + row.outstandingOmr);
        }

        const chart: AssistantChart | null =
          rows.length > 0
            ? {
                type: "bar",
                title: "Liabilities by Type",
                unit: "omr",
                series: [
                  {
                    name: "Outstanding",
                    points: [...byType.entries()].map(([type, value]) => ({
                      label: type,
                      value,
                    })),
                  },
                ],
              }
            : null;

        return {
          count: rows.length,
          totalOutstandingOmr: totalOmr,
          liabilities: rows,
          chart,
        };
      },
    }),

    get_cash_balances: tool({
      description: "Get cash and bank account balances aggregated by bank, entity, and currency.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!canAccess(ctx, "CASH_MANAGEMENT")) return accessDenied("Cash Management");

        const summary = await getCashSummary(ctx);
        const chart: AssistantChart | null =
          summary.byCurrency.length > 0
            ? {
                type: "pie",
                title: "Cash by Currency",
                unit: "omr",
                series: [
                  {
                    name: "Cash",
                    points: summary.byCurrency.map((row) => ({
                      label: row.label,
                      value: row.totalOmr,
                    })),
                  },
                ],
              }
            : null;

        return {
          totalOmr: summary.totalOmr,
          accountCount: summary.accountCount,
          staleCount: summary.staleCount,
          lastUpdated: summary.lastUpdated?.toISOString() ?? null,
          byBank: summary.byBank,
          byEntity: summary.byEntity,
          byCurrency: summary.byCurrency,
          chart,
        };
      },
    }),

    get_pe_summary: tool({
      description:
        "Get private equity / VC portfolio summary: invested capital, fair value, MOIC, distributions.",
      inputSchema: z.object({ entityId: entityIdSchema }),
      execute: async ({ entityId }) => {
        if (!canAccess(ctx, "PRIVATE_EQUITY")) return accessDenied("Private Equity");

        const summary = await getPePortfolioSummary(ctx, entityId);
        if (!summary) return { error: "No entity found for PE portfolio." };

        const chart: AssistantChart | null =
          summary.companyCount > 0
            ? {
                type: "bar",
                title: "PE Portfolio",
                unit: "omr",
                series: [
                  {
                    name: summary.reportingCurrency,
                    points: [
                      { label: "Invested", value: summary.totalInvested },
                      { label: "Fair Value", value: summary.totalFairValue },
                      { label: "Distributed", value: summary.totalDistributed },
                    ],
                  },
                ],
              }
            : null;

        return { ...summary, chart };
      },
    }),

    get_lp_summary: tool({
      description:
        "Get fund LP portfolio summary: commitments, paid-in, NAV, unfunded, distributions.",
      inputSchema: z.object({ entityId: entityIdSchema }),
      execute: async ({ entityId }) => {
        if (!canAccess(ctx, "FUND_LP")) return accessDenied("Fund LP");

        const summary = await getLpPortfolioSummary(ctx, entityId);
        if (!summary) return { error: "No entity found for LP portfolio." };

        const chart: AssistantChart | null =
          summary.commitmentCount > 0
            ? {
                type: "bar",
                title: "LP Portfolio",
                unit: "omr",
                series: [
                  {
                    name: "OMR",
                    points: [
                      { label: "Paid In", value: summary.totalPaidIn },
                      { label: "NAV", value: summary.totalNavOmr },
                      { label: "Unfunded", value: summary.totalUnfunded },
                      { label: "Distributed", value: summary.totalDistributed },
                    ],
                  },
                ],
              }
            : null;

        return { ...summary, chart };
      },
    }),

    get_real_estate_summary: tool({
      description:
        "Get real estate investment portfolio summary: property count, value, occupancy, rental income.",
      inputSchema: z.object({ entityId: entityIdSchema }),
      execute: async ({ entityId }) => {
        if (!canAccess(ctx, "REAL_ESTATE")) return accessDenied("Real Estate");

        const summary = await getRealEstateSummary(ctx, entityId);
        return {
          ...summary,
          chart:
            summary.totalProperties > 0
              ? {
                  type: "bar" as const,
                  title: "Real Estate Income vs Value",
                  unit: "omr" as const,
                  series: [
                    {
                      name: "OMR",
                      points: [
                        {
                          label: "Portfolio Value",
                          value: summary.totalPortfolioValueOmr,
                        },
                        {
                          label: "Monthly Rent",
                          value: summary.totalGrossMonthlyRentOmr,
                        },
                        {
                          label: "Overdue Rent",
                          value: summary.totalOverdueRentOmr,
                        },
                      ],
                    },
                  ],
                }
              : null,
        };
      },
    }),

    get_exit_analytics: tool({
      description:
        "Get realized exit analytics: total gain, average ROI, win rate, breakdown by category.",
      inputSchema: z.object({
        entityId: entityIdSchema,
        months: z
          .number()
          .int()
          .min(1)
          .max(120)
          .optional()
          .describe("Look back this many months (default 12)"),
      }),
      execute: async ({ entityId, months = 12 }) => {
        const hasAccess =
          canAccess(ctx, "ASSETS") ||
          canAccess(ctx, "PRIVATE_EQUITY") ||
          canAccess(ctx, "REAL_ESTATE");
        if (!hasAccess) return accessDenied("Exits");

        const to = new Date();
        const from = new Date();
        from.setMonth(from.getMonth() - months);

        const summary = await getExitAnalyticsSummary(ctx, { entityId, from, to });
        const chart: AssistantChart | null =
          summary.byCategory.length > 0
            ? {
                type: "bar",
                title: "Realized Gains by Category",
                unit: "omr",
                series: [
                  {
                    name: "Gain",
                    points: summary.byCategory.map((row) => ({
                      label: categoryLabel(row.category),
                      value: row.gainOmr,
                    })),
                  },
                ],
              }
            : null;

        return { periodMonths: months, ...summary, chart };
      },
    }),

    get_reminders: tool({
      description:
        "Get upcoming reminders: document expiries, insurance renewals, cheques, calendar deadlines.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!canAccess(ctx, "DASHBOARD")) return accessDenied("Dashboard");

        const summary = await getDashboardSummary(ctx);
        return {
          count: summary.reminderCount,
          reminders: summary.reminders.map((item) => ({
            kind: item.kind,
            title: item.title,
            subtitle: item.subtitle,
            date: item.date?.toISOString().slice(0, 10) ?? null,
            severity: item.severity,
            href: item.href,
          })),
        };
      },
    }),

    compute_financial_ratio: tool({
      description:
        "Compute a financial ratio from live portfolio data: debt_to_equity, liquidity (cash/net worth), or pe_allocation (PE fair value / net worth).",
      inputSchema: z.object({
        ratio: z.enum(["debt_to_equity", "liquidity", "pe_allocation"]),
        entityId: entityIdSchema,
      }),
      execute: async ({ ratio, entityId }) => {
        if (ratio === "debt_to_equity") {
          if (!canAccess(ctx, "ASSETS")) return accessDenied("Assets");
          const rollup = await getPortfolioRollup(ctx, { entityId });
          const value =
            rollup.netWorthTotalOmr > 0
              ? rollup.liabilityTotalOmr / rollup.netWorthTotalOmr
              : null;
          return {
            ratio: "debt_to_equity",
            value,
            formula: "Total liabilities ÷ Net worth",
            inputs: {
              liabilitiesOmr: rollup.liabilityTotalOmr,
              netWorthOmr: rollup.netWorthTotalOmr,
            },
            chart: liabilitiesVsNetWorthChart(
              rollup.liabilityTotalOmr,
              rollup.netWorthTotalOmr,
            ),
          };
        }

        if (ratio === "liquidity") {
          if (!canAccess(ctx, "CASH_MANAGEMENT") || !canAccess(ctx, "ASSETS")) {
            return accessDenied("Cash Management and Assets");
          }
          const [cash, rollup] = await Promise.all([
            getCashSummary(ctx),
            getPortfolioRollup(ctx, { entityId }),
          ]);
          const value =
            rollup.netWorthTotalOmr > 0 ? cash.totalOmr / rollup.netWorthTotalOmr : null;
          return {
            ratio: "liquidity",
            value,
            formula: "Total cash ÷ Net worth",
            inputs: {
              cashOmr: cash.totalOmr,
              netWorthOmr: rollup.netWorthTotalOmr,
            },
          };
        }

        if (!canAccess(ctx, "PRIVATE_EQUITY") || !canAccess(ctx, "ASSETS")) {
          return accessDenied("Private Equity and Assets");
        }
        const [pe, rollup] = await Promise.all([
          getPePortfolioSummary(ctx, entityId),
          getPortfolioRollup(ctx, { entityId }),
        ]);
        const peValue = pe?.totalFairValue ?? 0;
        const value = rollup.netWorthTotalOmr > 0 ? peValue / rollup.netWorthTotalOmr : null;
        return {
          ratio: "pe_allocation",
          value,
          formula: "PE fair value ÷ Net worth",
          inputs: {
            peFairValue: peValue,
            netWorthOmr: rollup.netWorthTotalOmr,
            reportingCurrency: pe?.reportingCurrency ?? "USD",
          },
        };
      },
    }),
  };
}

export type AssistantTools = ReturnType<typeof createAssistantTools>;
