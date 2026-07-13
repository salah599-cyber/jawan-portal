import { canAccess } from "@/lib/permissions/access";
import { getCashSummary } from "@/lib/data/cash-management";
import { getLpPortfolioSummary, listLpCommitments } from "@/lib/data/lp-fund";
import { getPePortfolioSummary, listPeCompanies } from "@/lib/data/pe-portfolio";
import { ensureLpFundSchema } from "@/lib/db/ensure-lp-fund-schema";
import { ensurePeSchema } from "@/lib/db/ensure-pe-schema";
import { formatIrr, formatMultiple } from "@/lib/lp/xirr";
import { ASSET_CATEGORY_LABELS } from "@/lib/labels";
import { getPortfolioPerformance } from "@/lib/portfolio/performance";
import { getPortfolioRollup } from "@/lib/portfolio/rollup";
import type { UserContext } from "@/lib/permissions/types";
import {
  convertToOmr,
  formatAmount,
  resolveEntityName,
} from "@/lib/reports/helpers";
import type { ReportParams, ReportResult, ReportSection } from "@/lib/reports/types";

function allocationCategoryLabel(categoryKey: string): string {
  return categoryKey.startsWith("custom:")
    ? categoryKey.slice("custom:".length)
    : (ASSET_CATEGORY_LABELS[categoryKey] ?? categoryKey);
}

/**
 * Monthly Board Pack — executive scorecard comparable in structure to
 * Landytech/Masttro stakeholder packs: net worth, allocation, performance,
 * PE MOIC/IRR, LP multiples, and cash liquidity.
 */
export async function buildBoardPackReport(
  ctx: UserContext,
  params: ReportParams,
): Promise<ReportResult> {
  const entityName = await resolveEntityName(params.entityId);
  const rollup = await getPortfolioRollup(ctx, { entityId: params.entityId });
  const performance = await getPortfolioPerformance(ctx, {
    entityId: params.entityId,
    period: "month",
  });

  const canPe = canAccess(ctx, "PRIVATE_EQUITY");
  const canLp = canAccess(ctx, "FUND_LP");
  const canCash = canAccess(ctx, "CASH_MANAGEMENT");

  const [peSummary, peCompanies, lpSummary, lpCommitments, cashSummary] =
    await Promise.all([
      canPe
        ? ensurePeSchema().then(() => getPePortfolioSummary(ctx, params.entityId))
        : Promise.resolve(null),
      canPe
        ? ensurePeSchema().then(() => listPeCompanies(ctx, params.entityId))
        : Promise.resolve([]),
      canLp
        ? ensureLpFundSchema().then(() => getLpPortfolioSummary(ctx, params.entityId))
        : Promise.resolve(null),
      canLp
        ? ensureLpFundSchema().then(() => listLpCommitments(ctx, params.entityId))
        : Promise.resolve([]),
      canCash ? getCashSummary(ctx) : Promise.resolve(null),
    ]);

  const scorecardRows = [
    {
      section: "Balance sheet",
      metric: "Portfolio value",
      value: formatAmount(rollup.portfolioTotalOmr, "OMR"),
    },
    {
      section: "Balance sheet",
      metric: "Liabilities",
      value: formatAmount(rollup.liabilityTotalOmr, "OMR"),
    },
    {
      section: "Balance sheet",
      metric: "Net worth",
      value: formatAmount(rollup.netWorthTotalOmr, "OMR"),
    },
    {
      section: "Performance",
      metric: "MTD return",
      value:
        performance.periodReturnPct != null
          ? `${performance.periodReturnPct.toFixed(2)}%`
          : "—",
    },
    {
      section: "Performance",
      metric: "YTD return",
      value:
        performance.ytdReturnPct != null
          ? `${performance.ytdReturnPct.toFixed(2)}%`
          : "—",
    },
  ];

  if (peSummary) {
    scorecardRows.push(
      {
        section: "Private equity",
        metric: "Portfolio MOIC",
        value: formatMultiple(peSummary.portfolioMoic) ?? "—",
      },
      {
        section: "Private equity",
        metric: "Fair value",
        value: formatAmount(peSummary.totalFairValue, peSummary.reportingCurrency),
      },
    );
  }

  if (lpSummary) {
    scorecardRows.push(
      {
        section: "Fund LP",
        metric: "Unfunded commitments",
        value: formatAmount(lpSummary.totalUnfunded, lpSummary.reportingCurrency),
      },
      {
        section: "Fund LP",
        metric: "Latest NAV",
        value: formatAmount(lpSummary.totalNav, lpSummary.reportingCurrency),
      },
    );
  }

  if (cashSummary) {
    scorecardRows.push({
      section: "Cash",
      metric: "Cash (OMR)",
      value: formatAmount(cashSummary.totalOmr, "OMR"),
    });
  }

  const allocationRows: Array<{
    category: string;
    value: string;
    weight: string;
  }> = [];

  for (const [categoryKey, entry] of rollup.categoryMap) {
    let amountOmr = 0;
    for (const [currency, amount] of entry.totals) {
      amountOmr += await convertToOmr(amount, currency);
    }
    allocationRows.push({
      category: allocationCategoryLabel(categoryKey),
      value: formatAmount(amountOmr, "OMR"),
      weight:
        rollup.portfolioTotalOmr > 0
          ? `${((amountOmr / rollup.portfolioTotalOmr) * 100).toFixed(1)}%`
          : "—",
    });
  }
  allocationRows.sort((a, b) => a.category.localeCompare(b.category));

  const sections: ReportSection[] = [
    {
      title: "Asset allocation",
      columns: [
        { key: "category", label: "Category" },
        { key: "value", label: "Value (OMR)", align: "right" },
        { key: "weight", label: "Weight", align: "right" },
      ],
      rows: allocationRows,
    },
  ];

  if (peCompanies.length > 0) {
    sections.push({
      title: "PE / VC highlights",
      metrics: peSummary
        ? [
            { label: "Companies", value: peSummary.companyCount.toString() },
            {
              label: "Portfolio MOIC",
              value: formatMultiple(peSummary.portfolioMoic) ?? "—",
            },
            {
              label: "Invested",
              value: formatAmount(peSummary.totalInvested, peSummary.reportingCurrency),
            },
            {
              label: "Fair value",
              value: formatAmount(peSummary.totalFairValue, peSummary.reportingCurrency),
            },
          ]
        : undefined,
      columns: [
        { key: "company", label: "Company" },
        { key: "invested", label: "Invested", align: "right" },
        { key: "fairValue", label: "Fair Value", align: "right" },
        { key: "moic", label: "MOIC", align: "right" },
        { key: "irr", label: "Net IRR", align: "right" },
      ],
      rows: peCompanies.slice(0, 12).map((company) => ({
        company: company.name,
        invested: formatAmount(company.totalInvested, company.reportingCurrency),
        fairValue: formatAmount(company.latestFairValue, company.reportingCurrency),
        moic: formatMultiple(company.moic) ?? "—",
        irr: formatIrr(company.netIrr) ?? "—",
      })),
    });
  }

  if (lpCommitments.length > 0) {
    sections.push({
      title: "Fund LP highlights",
      metrics: lpSummary
        ? [
            {
              label: "Commitments",
              value: lpSummary.commitmentCount.toString(),
            },
            {
              label: "Paid-in",
              value: formatAmount(lpSummary.totalPaidIn, lpSummary.reportingCurrency),
            },
            {
              label: "NAV",
              value: formatAmount(lpSummary.totalNav, lpSummary.reportingCurrency),
            },
            {
              label: "Unfunded",
              value: formatAmount(lpSummary.totalUnfunded, lpSummary.reportingCurrency),
            },
          ]
        : undefined,
      columns: [
        { key: "fund", label: "Fund" },
        { key: "paidIn", label: "Paid-In", align: "right" },
        { key: "nav", label: "NAV", align: "right" },
        { key: "dpi", label: "DPI", align: "right" },
        { key: "tvpi", label: "TVPI", align: "right" },
        { key: "irr", label: "Net IRR", align: "right" },
      ],
      rows: lpCommitments.slice(0, 12).map((row) => ({
        fund: row.fundName,
        paidIn: formatAmount(row.paidInCapital, row.commitmentCurrency),
        nav: formatAmount(row.latestNav, row.commitmentCurrency),
        dpi: formatMultiple(row.dpi) ?? "—",
        tvpi: formatMultiple(row.tvpi) ?? "—",
        irr: formatIrr(row.netIrr) ?? "—",
      })),
    });
  }

  return {
    reportId: "board-pack",
    title: "Monthly Board Pack",
    description: "Executive portfolio summary for principals and finance.",
    generatedAt: new Date(),
    entityName: entityName ?? undefined,
    metrics: [
      {
        label: "Net worth",
        value: formatAmount(rollup.netWorthTotalOmr, "OMR"),
        detail: entityName ?? "All accessible entities",
      },
      {
        label: "MTD return",
        value:
          performance.periodReturnPct != null
            ? `${performance.periodReturnPct.toFixed(2)}%`
            : "—",
        detail:
          performance.periodReturnOmr != null
            ? formatAmount(performance.periodReturnOmr, "OMR")
            : undefined,
      },
      {
        label: "PE MOIC",
        value: formatMultiple(peSummary?.portfolioMoic ?? null) ?? "—",
        detail: peSummary
          ? `${peSummary.companyCount} companies`
          : "No PE access or data",
      },
      {
        label: "LP unfunded",
        value: lpSummary
          ? formatAmount(lpSummary.totalUnfunded, lpSummary.reportingCurrency)
          : "—",
        detail: lpSummary
          ? `${lpSummary.commitmentCount} commitments`
          : "No LP access or data",
      },
    ],
    columns: [
      { key: "section", label: "Section" },
      { key: "metric", label: "Metric" },
      { key: "value", label: "Value", align: "right" },
    ],
    rows: scorecardRows,
    sections,
    footnotes: [
      "Net worth and allocation use ownership-adjusted OMR values.",
      "Portfolio MTD/YTD returns are valuation-based until transaction-level TWR is available.",
      "PE MOIC = (fair value or exit proceeds + distributions) ÷ invested capital. Net IRR is money-weighted (XIRR).",
      "LP DPI / RVPI / TVPI and net IRR use paid-in capital, distributions, and latest NAV.",
      "Open detailed PE, LP, cash, and performance reports for full registers.",
    ],
  };
}
