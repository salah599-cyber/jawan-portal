import { tool } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  citation,
  type AssistantChart,
  type AssistantCitation,
} from "@/lib/assistant/types";
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
import { canAccess, getModulePermission } from "@/lib/permissions/access";
import {
  assetEntityFilter,
  carEntityFilter,
  chequeEntityFilter,
  companyEntityFilter,
  documentFilter,
  expenseEntityFilter,
  familyMemberFilter,
  insurancePolicyEntityFilter,
  landEntityFilter,
  loanEntityFilter,
  proposalEntityFilter,
  successionPlanFilter,
} from "@/lib/permissions/scoped-queries";
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

function moduleCitation(label: string, href: string): AssistantCitation[] {
  return [citation(label, href)];
}

function recordCitations(
  rows: { id: string; label: string; href: string }[],
  limit = 8,
): AssistantCitation[] {
  return rows.slice(0, limit).map((row) => citation(row.label, row.href, row.id));
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

function toNumber(value: { toString(): string } | number | null | undefined): number | null {
  if (value == null) return null;
  const num = typeof value === "number" ? value : Number(value.toString());
  return Number.isNaN(num) ? null : num;
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
          citations: moduleCitation("Assets", "/assets"),
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
          citations: moduleCitation("Assets", "/assets"),
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
          citations: moduleCitation("Dashboard", "/dashboard"),
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
          citations: [
            ...moduleCitation("Assets", "/assets"),
            ...recordCitations(
              performance.assetRows.slice(0, 5).map((row) => ({
                id: row.id,
                label: row.name,
                href: row.href,
              })),
            ),
          ],
        };
      },
    }),

    get_liabilities: tool({
      description: "List active liabilities and loans with outstanding balances and maturity dates.",
      inputSchema: z.object({ entityId: entityIdSchema }),
      execute: async ({ entityId }) => {
        if (!canAccess(ctx, "ASSETS") && !canAccess(ctx, "LOANS")) {
          return accessDenied("Loans");
        }

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
              id: liability.id,
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
              href: `/loans/${liability.id}`,
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
          citations: [
            ...moduleCitation("Loans", "/loans"),
            ...recordCitations(
              rows.map((row) => ({ id: row.id, label: row.name, href: row.href })),
            ),
          ],
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
          citations: moduleCitation("Cash Management", "/cash"),
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

        return {
          ...summary,
          chart,
          citations: moduleCitation("PE / VC Portfolio", "/portfolio/pe"),
        };
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

        return {
          ...summary,
          chart,
          citations: moduleCitation("Fund LP Investments", "/portfolio/fund-lp"),
        };
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
          citations: moduleCitation("Real Estate", "/real-estate"),
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

        return {
          periodMonths: months,
          ...summary,
          chart,
          citations: moduleCitation("Exits", "/portfolio/exits"),
        };
      },
    }),

    get_reminders: tool({
      description:
        "Get upcoming reminders: document expiries, insurance renewals, cheques, calendar deadlines.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!canAccess(ctx, "DASHBOARD")) return accessDenied("Dashboard");

        const summary = await getDashboardSummary(ctx);
        const reminders = summary.reminders.map((item) => ({
          kind: item.kind,
          title: item.title,
          subtitle: item.subtitle,
          date: item.date?.toISOString().slice(0, 10) ?? null,
          severity: item.severity,
          href: item.href,
        }));

        return {
          count: summary.reminderCount,
          reminders,
          citations: [
            ...moduleCitation("Calendar", "/calendar"),
            ...recordCitations(
              reminders
                .filter((item) => Boolean(item.href))
                .map((item, index) => ({
                  id: `${item.kind}-${index}`,
                  label: item.title,
                  href: item.href,
                })),
            ),
          ],
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
            citations: moduleCitation("Assets", "/assets"),
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
            citations: [
              ...moduleCitation("Cash Management", "/cash"),
              ...moduleCitation("Assets", "/assets"),
            ],
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
          citations: [
            ...moduleCitation("PE / VC Portfolio", "/portfolio/pe"),
            ...moduleCitation("Assets", "/assets"),
          ],
        };
      },
    }),

    get_lands_summary: tool({
      description: "List land parcels with location, value, and status.",
      inputSchema: z.object({ entityId: entityIdSchema }),
      execute: async ({ entityId }) => {
        if (!canAccess(ctx, "LANDS")) return accessDenied("Lands");
        const lands = await db.landParcel.findMany({
          where: {
            ...entityWhere(entityId, landEntityFilter(ctx)),
            status: { not: "EXITED" },
          },
          include: { entity: { select: { name: true } } },
          orderBy: { updatedAt: "desc" },
          take: 50,
        });

        const rows = await Promise.all(
          lands.map(async (land) => {
            const currentValue = toNumber(land.currentValue);
            const currentValueOmr =
              currentValue != null ? await convertToOmr(currentValue, land.currency) : null;
            return {
              id: land.id,
              name: land.name,
              entity: land.entity.name,
              country: land.country,
              location: [land.governorate, land.wilayat, land.city].filter(Boolean).join(", "),
              status: land.status,
              currency: land.currency,
              currentValue,
              currentValueOmr,
              href: `/lands/${land.id}`,
            };
          }),
        );

        const totalOmr = rows.reduce((sum, row) => sum + (row.currentValueOmr ?? 0), 0);
        return {
          count: rows.length,
          totalCurrentValueOmr: totalOmr,
          lands: rows,
          citations: [
            ...moduleCitation("Lands", "/lands"),
            ...recordCitations(rows.map((row) => ({ id: row.id, label: row.name, href: row.href }))),
          ],
        };
      },
    }),

    get_cars_summary: tool({
      description: "List vehicles with make/model, registration, insurance expiry, and value.",
      inputSchema: z.object({ entityId: entityIdSchema }),
      execute: async ({ entityId }) => {
        if (!canAccess(ctx, "CARS")) return accessDenied("Cars");
        const cars = await db.vehicle.findMany({
          where: {
            ...entityWhere(entityId, carEntityFilter(ctx)),
            OR: [{ assetId: null }, { asset: { status: { not: "EXITED" } } }],
          },
          include: { entity: { select: { name: true } } },
          orderBy: { updatedAt: "desc" },
          take: 50,
        });

        const rows = await Promise.all(
          cars.map(async (car) => {
            const currentValue = toNumber(car.currentValue);
            const currentValueOmr =
              currentValue != null
                ? await convertToOmr(currentValue, car.currency ?? "OMR")
                : null;
            return {
              id: car.id,
              name: car.name,
              entity: car.entity.name,
              make: car.make,
              model: car.model,
              plateNumber: car.plateNumber,
              registrationExpiryDate:
                car.registrationExpiryDate?.toISOString().slice(0, 10) ?? null,
              insuranceExpiryDate: car.insuranceExpiryDate?.toISOString().slice(0, 10) ?? null,
              currentValue,
              currentValueOmr,
              href: `/cars/${car.id}`,
            };
          }),
        );

        return {
          count: rows.length,
          totalCurrentValueOmr: rows.reduce((sum, row) => sum + (row.currentValueOmr ?? 0), 0),
          cars: rows,
          citations: [
            ...moduleCitation("Cars", "/cars"),
            ...recordCitations(rows.map((row) => ({ id: row.id, label: row.name, href: row.href }))),
          ],
        };
      },
    }),

    get_companies_summary: tool({
      description: "List registered companies with registration details and status.",
      inputSchema: z.object({ entityId: entityIdSchema }),
      execute: async ({ entityId }) => {
        if (!canAccess(ctx, "COMPANIES")) return accessDenied("Companies");
        const companies = await db.registeredCompany.findMany({
          where: {
            ...entityWhere(entityId, companyEntityFilter(ctx)),
            status: { not: "EXITED" },
          },
          include: { entity: { select: { name: true } } },
          orderBy: { updatedAt: "desc" },
          take: 50,
        });

        const rows = companies.map((company) => ({
          id: company.id,
          name: company.name,
          entity: company.entity.name,
          registrationNumber: company.registrationNumber,
          registrationExpiryDate:
            company.registrationExpiryDate?.toISOString().slice(0, 10) ?? null,
          status: company.status,
          href: `/companies/${company.id}`,
        }));

        return {
          count: rows.length,
          companies: rows,
          citations: [
            ...moduleCitation("Companies", "/companies"),
            ...recordCitations(rows.map((row) => ({ id: row.id, label: row.name, href: row.href }))),
          ],
        };
      },
    }),

    get_precious_metals_summary: tool({
      description: "Summarize precious metal holdings (gold, silver, etc.) from the asset registry.",
      inputSchema: z.object({ entityId: entityIdSchema }),
      execute: async ({ entityId }) => {
        if (!canAccess(ctx, "ASSETS")) return accessDenied("Assets");
        const assets = await db.asset.findMany({
          where: {
            ...entityWhere(entityId, assetEntityFilter(ctx)),
            category: "PRECIOUS_METALS",
            status: { not: "EXITED" },
          },
          include: {
            entity: { select: { name: true } },
            preciousMetal: true,
          },
          orderBy: { updatedAt: "desc" },
          take: 50,
        });

        const rows = await Promise.all(
          assets.map(async (asset) => {
            const value = toNumber(asset.currentValue) ?? toNumber(asset.acquisitionCost) ?? 0;
            const valueOmr = await convertToOmr(value, asset.currency);
            return {
              id: asset.id,
              name: asset.name,
              entity: asset.entity.name,
              metal: asset.preciousMetal?.metal ?? null,
              quantity: toNumber(asset.preciousMetal?.quantity),
              unit: asset.preciousMetal?.unit ?? null,
              currency: asset.currency,
              valueOmr,
              href: `/assets/${asset.id}`,
            };
          }),
        );

        return {
          count: rows.length,
          totalValueOmr: rows.reduce((sum, row) => sum + row.valueOmr, 0),
          holdings: rows,
          citations: [
            ...moduleCitation("Assets", "/assets"),
            ...recordCitations(rows.map((row) => ({ id: row.id, label: row.name, href: row.href }))),
          ],
        };
      },
    }),

    get_cheques_summary: tool({
      description: "List outstanding or recent cheques with amounts and due dates.",
      inputSchema: z.object({
        entityId: entityIdSchema,
        status: z
          .enum(["PENDING", "DEPOSITED", "CLEARED", "BOUNCED", "CANCELLED", "STOPPED", "ALL"])
          .optional()
          .describe("Filter by cheque status (default PENDING)"),
      }),
      execute: async ({ entityId, status = "PENDING" }) => {
        if (!canAccess(ctx, "CHEQUES")) return accessDenied("Cheques");
        const cheques = await db.cheque.findMany({
          where: {
            ...entityWhere(entityId, chequeEntityFilter(ctx)),
            ...(status === "ALL" ? {} : { status }),
          },
          include: { entity: { select: { name: true } } },
          orderBy: [{ dueDate: "asc" }, { issueDate: "desc" }],
          take: 50,
        });

        const rows = await Promise.all(
          cheques.map(async (cheque) => {
            const amount = Number(cheque.amount.toString());
            const amountOmr = await convertToOmr(amount, cheque.currency);
            return {
              id: cheque.id,
              chequeNumber: cheque.chequeNumber,
              direction: cheque.direction,
              status: cheque.status,
              payee: cheque.payee,
              entity: cheque.entity.name,
              amount,
              amountOmr,
              currency: cheque.currency,
              dueDate: cheque.dueDate?.toISOString().slice(0, 10) ?? null,
              href: `/cheques/${cheque.id}`,
            };
          }),
        );

        return {
          count: rows.length,
          totalAmountOmr: rows.reduce((sum, row) => sum + row.amountOmr, 0),
          cheques: rows,
          citations: [
            ...moduleCitation("Cheques", "/cheques"),
            ...recordCitations(
              rows.map((row) => ({
                id: row.id,
                label: `${row.chequeNumber} · ${row.payee}`,
                href: row.href,
              })),
            ),
          ],
        };
      },
    }),

    get_expenses_summary: tool({
      description: "List expenses, focusing on pending or upcoming dues.",
      inputSchema: z.object({
        entityId: entityIdSchema,
        status: z
          .enum(["PENDING", "PAID", "OVERDUE", "ALL"])
          .optional()
          .describe("Filter by expense status (default PENDING)"),
      }),
      execute: async ({ entityId, status = "PENDING" }) => {
        if (!canAccess(ctx, "EXPENSES")) return accessDenied("Expenses");
        const expenses = await db.expense.findMany({
          where: {
            ...entityWhere(entityId, expenseEntityFilter(ctx)),
            ...(status === "ALL" ? {} : { status }),
          },
          include: {
            entity: { select: { name: true } },
            expenseType: { select: { name: true } },
          },
          orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
          take: 50,
        });

        const rows = await Promise.all(
          expenses.map(async (expense) => {
            const amount = Number(expense.amount.toString());
            const amountOmr = await convertToOmr(amount, expense.currency);
            return {
              id: expense.id,
              title: expense.title,
              entity: expense.entity?.name ?? null,
              category: expense.expenseType?.name ?? expense.category,
              status: expense.status,
              amount,
              amountOmr,
              currency: expense.currency,
              dueDate: expense.dueDate?.toISOString().slice(0, 10) ?? null,
              href: `/expenses/${expense.id}`,
            };
          }),
        );

        return {
          count: rows.length,
          totalAmountOmr: rows.reduce((sum, row) => sum + row.amountOmr, 0),
          expenses: rows,
          citations: [
            ...moduleCitation("Expenses", "/expenses"),
            ...recordCitations(
              rows.map((row) => ({ id: row.id, label: row.title, href: row.href })),
            ),
          ],
        };
      },
    }),

    get_proposals_summary: tool({
      description: "List investment proposals with status, amount, and submission details.",
      inputSchema: z.object({
        entityId: entityIdSchema,
        status: z
          .enum(["DRAFT", "PENDING", "RETURNED", "APPROVED", "REJECTED", "ALL"])
          .optional()
          .describe("Filter by proposal status (default ALL)"),
      }),
      execute: async ({ entityId, status = "ALL" }) => {
        if (!canAccess(ctx, "PROPOSALS")) return accessDenied("Proposals");
        const proposals = await db.investmentProposal.findMany({
          where: {
            ...entityWhere(entityId, proposalEntityFilter(ctx)),
            ...(status === "ALL" ? {} : { status }),
          },
          include: {
            entity: { select: { name: true } },
            submittedBy: { select: { firstName: true, lastName: true, email: true } },
            approvers: { select: { userId: true, decision: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 50,
        });

        const level = getModulePermission(ctx, "PROPOSALS");
        const visible = proposals.filter((proposal) => {
          if (proposal.submittedById === ctx.id) return true;
          if (proposal.approvers.some((a) => a.userId === ctx.id)) return true;
          return level === "FULL" || level === "READ";
        });

        const rows = await Promise.all(
          visible.map(async (proposal) => {
            const amount = Number(proposal.suggestedAmount.toString());
            const amountOmr = await convertToOmr(amount, proposal.currency);
            return {
              id: proposal.id,
              name: proposal.name,
              status: proposal.status,
              entity: proposal.entity?.name ?? null,
              suggestedAmount: amount,
              suggestedAmountOmr: amountOmr,
              currency: proposal.currency,
              submittedBy:
                [proposal.submittedBy.firstName, proposal.submittedBy.lastName]
                  .filter(Boolean)
                  .join(" ") || proposal.submittedBy.email,
              submittedAt: proposal.submittedAt?.toISOString().slice(0, 10) ?? null,
              href: `/proposals/${proposal.id}`,
            };
          }),
        );

        return {
          count: rows.length,
          proposals: rows,
          citations: [
            ...moduleCitation("Proposals", "/proposals"),
            ...recordCitations(rows.map((row) => ({ id: row.id, label: row.name, href: row.href }))),
          ],
        };
      },
    }),

    get_documents_expiring: tool({
      description: "List vault documents nearing expiry (or already expired).",
      inputSchema: z.object({
        withinDays: z
          .number()
          .int()
          .min(1)
          .max(365)
          .optional()
          .describe("Include documents expiring within this many days (default 90)"),
      }),
      execute: async ({ withinDays = 90 }) => {
        if (!canAccess(ctx, "DOCUMENTS")) return accessDenied("Documents");
        const now = new Date();
        const until = new Date();
        until.setDate(until.getDate() + withinDays);

        const documents = await db.document.findMany({
          where: {
            ...documentFilter(ctx),
            expiryDate: { not: null, lte: until },
          },
          include: {
            entity: { select: { name: true } },
            category: { select: { name: true } },
          },
          orderBy: { expiryDate: "asc" },
          take: 50,
        });

        const rows = documents.map((doc) => ({
          id: doc.id,
          name: doc.name,
          category: doc.category.name,
          entity: doc.entity?.name ?? null,
          status: doc.status,
          expiryDate: doc.expiryDate?.toISOString().slice(0, 10) ?? null,
          expired: doc.expiryDate != null && doc.expiryDate < now,
          href: `/documents`,
        }));

        return {
          withinDays,
          count: rows.length,
          documents: rows,
          citations: [
            ...moduleCitation("Documents", "/documents"),
            ...recordCitations(rows.map((row) => ({ id: row.id, label: row.name, href: row.href }))),
          ],
        };
      },
    }),

    get_insurance_summary: tool({
      description: "List insurance policies, highlighting upcoming renewals/expiries.",
      inputSchema: z.object({
        entityId: entityIdSchema,
        withinDays: z
          .number()
          .int()
          .min(1)
          .max(365)
          .optional()
          .describe("Highlight policies expiring within this many days (default 90)"),
      }),
      execute: async ({ entityId, withinDays = 90 }) => {
        if (!canAccess(ctx, "INSURANCE")) return accessDenied("Insurance");
        const until = new Date();
        until.setDate(until.getDate() + withinDays);

        const policies = await db.insurancePolicy.findMany({
          where: {
            ...entityWhere(entityId, insurancePolicyEntityFilter(ctx)),
            status: { in: ["ACTIVE", "PENDING_RENEWAL"] },
          },
          include: { entity: { select: { name: true } } },
          orderBy: [{ expiryDate: "asc" }, { updatedAt: "desc" }],
          take: 50,
        });

        const rows = policies.map((policy) => ({
          id: policy.id,
          insurer: policy.insurer,
          policyNumber: policy.policyNumber,
          policyType: policy.policyType,
          entity: policy.entity.name,
          status: policy.status,
          expiryDate: policy.expiryDate?.toISOString().slice(0, 10) ?? null,
          renewingSoon: policy.expiryDate != null && policy.expiryDate <= until,
          href: `/documents/insurance/${policy.id}`,
        }));

        return {
          count: rows.length,
          renewingSoonCount: rows.filter((row) => row.renewingSoon).length,
          policies: rows,
          citations: [
            ...moduleCitation("Insurance", "/documents/insurance"),
            ...recordCitations(
              rows.map((row) => ({
                id: row.id,
                label: `${row.insurer} · ${row.policyNumber}`,
                href: row.href,
              })),
            ),
          ],
        };
      },
    }),

    get_family_members_summary: tool({
      description: "List family members and beneficiaries with ID expiry and KYC status.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!canAccess(ctx, "FAMILY_MEMBERS")) return accessDenied("Family Members");
        const members = await db.familyMember.findMany({
          where: familyMemberFilter(ctx),
          orderBy: { fullName: "asc" },
          take: 100,
        });

        const rows = members.map((member) => ({
          id: member.id,
          fullName: member.fullName,
          relationship: member.relationship,
          isBeneficiary: member.isBeneficiary,
          kycStatus: member.kycStatus,
          idExpiryDate: member.idExpiryDate?.toISOString().slice(0, 10) ?? null,
          deceased: member.deceased,
          href: `/family/members/${member.id}`,
        }));

        return {
          count: rows.length,
          beneficiaryCount: rows.filter((row) => row.isBeneficiary).length,
          members: rows,
          citations: [
            ...moduleCitation("Family Members", "/family/members"),
            ...recordCitations(
              rows.map((row) => ({ id: row.id, label: row.fullName, href: row.href })),
            ),
          ],
        };
      },
    }),

    get_succession_summary: tool({
      description: "List succession plans with status and next review dates.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!canAccess(ctx, "SUCCESSION")) return accessDenied("Succession");
        const plans = await db.successionPlan.findMany({
          where: successionPlanFilter(ctx),
          include: { entity: { select: { name: true } } },
          orderBy: [{ nextReviewDate: "asc" }, { updatedAt: "desc" }],
          take: 50,
        });

        const rows = plans.map((plan) => ({
          id: plan.id,
          title: plan.title,
          status: plan.status,
          entity: plan.entity?.name ?? null,
          lastReviewDate: plan.lastReviewDate?.toISOString().slice(0, 10) ?? null,
          nextReviewDate: plan.nextReviewDate?.toISOString().slice(0, 10) ?? null,
          href: `/family/succession/${plan.id}`,
        }));

        return {
          count: rows.length,
          plans: rows,
          citations: [
            ...moduleCitation("Succession", "/family/succession"),
            ...recordCitations(
              rows.map((row) => ({ id: row.id, label: row.title, href: row.href })),
            ),
          ],
        };
      },
    }),
  };
}

export type AssistantTools = ReturnType<typeof createAssistantTools>;
