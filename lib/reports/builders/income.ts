import { canAccess } from "@/lib/permissions/access";
import type { UserContext } from "@/lib/permissions/types";
import {
  fetchPeDistributions,
  fetchLpDistributions,
  fetchRentalIncome,
  isIncomeDistribution,
  summarizeIncomeBySource,
} from "@/lib/data/portfolio-income";
import { PE_DISTRIBUTION_TYPE_LABELS } from "@/lib/labels";
import { LP_DISTRIBUTION_TYPE_LABELS } from "@/lib/lp/constants";
import {
  formatAmount,
  formatDateValue,
  parseDateRange,
  resolveEntityName,
} from "@/lib/reports/helpers";
import type { ReportId, ReportParams, ReportResult } from "@/lib/reports/types";

function baseResult(
  reportId: ReportId,
  title: string,
  description: string,
  entityName?: string,
): Omit<ReportResult, "metrics" | "columns" | "rows" | "footnotes"> {
  return {
    reportId,
    title,
    description,
    generatedAt: new Date(),
    entityName,
  };
}

function defaultFromDate(from?: Date): Date {
  return from ?? new Date(new Date().getFullYear(), 0, 1);
}

export async function buildRentalIncomeReport(
  ctx: UserContext,
  params: ReportParams,
): Promise<ReportResult> {
  const entityName = await resolveEntityName(params.entityId);
  const { from, to } = parseDateRange(params);
  const rentalRows = await fetchRentalIncome(ctx, {
    entityId: params.entityId,
    from: defaultFromDate(from),
    to,
  });

  const propertyIds = new Set(rentalRows.map((row) => row.propertyId));
  const totalCollected = rentalRows.reduce((sum, row) => sum + row.amountOmr, 0);

  const rows = rentalRows.map((row) => ({
    entity: row.entityName,
    property: row.propertyName,
    unit: row.unitNumber,
    tenant: row.tenantName,
    paidDate: formatDateValue(row.paidDate),
    amount: formatAmount(row.amountOmr, "OMR"),
  }));

  return {
    ...baseResult(
      "rental-income",
      "Rental Income Report",
      "Collected rental income for the selected period.",
      entityName,
    ),
    metrics: [
      { label: "Entries", value: rentalRows.length.toString() },
      { label: "Total Collected", value: formatAmount(totalCollected, "OMR") },
      { label: "Properties", value: propertyIds.size.toString() },
    ],
    columns: [
      { key: "entity", label: "Entity" },
      { key: "property", label: "Property" },
      { key: "unit", label: "Unit" },
      { key: "tenant", label: "Tenant" },
      { key: "paidDate", label: "Paid Date" },
      { key: "amount", label: "Amount", align: "right" },
    ],
    rows,
    footnotes: [
      "Shows collected rent only (paid or partially paid entries).",
      "Based on paid date, or due date when paid date is not recorded.",
      "Distinct from the Rent Collection Register, which tracks due, outstanding, and PDC status.",
    ],
  };
}

export async function buildDividendDistributionIncomeReport(
  ctx: UserContext,
  params: ReportParams,
): Promise<ReportResult> {
  const entityName = await resolveEntityName(params.entityId);
  const { from, to } = parseDateRange(params);
  const filters = {
    entityId: params.entityId,
    from: defaultFromDate(from),
    to,
  };

  const [peRows, lpRows] = await Promise.all([
    canAccess(ctx, "PRIVATE_EQUITY") ? fetchPeDistributions(ctx, filters) : Promise.resolve([]),
    canAccess(ctx, "FUND_LP") ? fetchLpDistributions(ctx, filters) : Promise.resolve([]),
  ]);

  const combined = [
    ...peRows.map((row) => ({
      date: row.distributionDate,
      source: "PE" as const,
      entity: row.entityName,
      investment: row.investmentName,
      type: PE_DISTRIBUTION_TYPE_LABELS[row.distributionType] ?? row.distributionType,
      amount: formatAmount(row.amount, row.currency),
      currency: row.currency,
      amountOmr: row.amountOmr,
      amountOmrFormatted: formatAmount(row.amountOmr, "OMR"),
    })),
    ...lpRows.map((row) => ({
      date: row.distributionDate,
      source: "LP" as const,
      entity: row.entityName,
      investment: row.investmentName,
      type: LP_DISTRIBUTION_TYPE_LABELS[row.distributionType] ?? row.distributionType,
      amount: formatAmount(row.amount, row.currency),
      currency: row.currency,
      amountOmr: row.amountOmr,
      amountOmrFormatted: formatAmount(row.amountOmr, "OMR"),
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const totalDistributionsOmr = combined.reduce((sum, row) => sum + row.amountOmr, 0);
  const peIncomeSubtotal = peRows
    .filter((row) => isIncomeDistribution("PE", row.distributionType))
    .reduce((sum, row) => sum + row.amountOmr, 0);
  const lpIncomeSubtotal = lpRows
    .filter((row) => isIncomeDistribution("LP", row.distributionType))
    .reduce((sum, row) => sum + row.amountOmr, 0);
  const incomeSubtotal = peIncomeSubtotal + lpIncomeSubtotal;

  const rows = combined.map((row) => ({
    date: formatDateValue(row.date),
    source: row.source,
    entity: row.entity,
    investment: row.investment,
    type: row.type,
    amount: row.amount,
    currency: row.currency,
    amountOmr: row.amountOmrFormatted,
  }));

  return {
    ...baseResult(
      "dividend-distribution-income",
      "Dividend & Distribution Income",
      "Private equity and fund LP distributions for the selected period.",
      entityName,
    ),
    metrics: [
      { label: "Total Distributions", value: formatAmount(totalDistributionsOmr, "OMR") },
      { label: "Income Subtotal", value: formatAmount(incomeSubtotal, "OMR") },
      { label: "PE Entries", value: peRows.length.toString() },
      { label: "LP Entries", value: lpRows.length.toString() },
    ],
    columns: [
      { key: "date", label: "Date" },
      { key: "source", label: "Source" },
      { key: "entity", label: "Entity" },
      { key: "investment", label: "Investment" },
      { key: "type", label: "Type" },
      { key: "amount", label: "Amount", align: "right" },
      { key: "currency", label: "Currency" },
      { key: "amountOmr", label: "OMR Equivalent", align: "right" },
    ],
    rows,
    footnotes: [
      "Public equity dividends are not tracked (no transactional dividend model).",
      "Return of capital and exit proceeds are shown but excluded from the income subtotal.",
      "Non-OMR amounts are converted using the latest stored FX rates.",
    ],
  };
}

export async function buildTotalPortfolioIncomeReport(
  ctx: UserContext,
  params: ReportParams,
): Promise<ReportResult> {
  const entityName = await resolveEntityName(params.entityId);
  const { from, to } = parseDateRange(params);
  const { rental, pe, lp, summary } = await summarizeIncomeBySource(ctx, {
    entityId: params.entityId,
    from: defaultFromDate(from),
    to,
  });

  const combined = [
    ...rental.map((row) => ({
      date: row.paidDate,
      category: "Rental" as const,
      entity: row.entityName,
      source: row.propertyName,
      detail: `${row.unitNumber} · ${row.tenantName}`,
      type: "Rent",
      amountOmr: row.amountOmr,
    })),
    ...pe.map((row) => ({
      date: row.distributionDate,
      category: "PE" as const,
      entity: row.entityName,
      source: row.investmentName,
      detail: PE_DISTRIBUTION_TYPE_LABELS[row.distributionType] ?? row.distributionType,
      type: row.distributionType,
      amountOmr: row.amountOmr,
    })),
    ...lp.map((row) => ({
      date: row.distributionDate,
      category: "LP" as const,
      entity: row.entityName,
      source: row.investmentName,
      detail: LP_DISTRIBUTION_TYPE_LABELS[row.distributionType] ?? row.distributionType,
      type: row.distributionType,
      amountOmr: row.amountOmr,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const rows = combined.map((row) => ({
    date: formatDateValue(row.date),
    category: row.category,
    entity: row.entity,
    source: row.source,
    detail: row.detail,
    amountOmr: formatAmount(row.amountOmr, "OMR"),
  }));

  const footnotes = [
    "Includes rental income and investment distributions for modules you can access.",
    "Income subtotal excludes return of capital and exit proceeds from PE/LP distributions.",
    "Non-OMR amounts are converted using the latest stored FX rates.",
  ];

  const missingModules: string[] = [];
  if (!canAccess(ctx, "REAL_ESTATE")) missingModules.push("Real Estate");
  if (!canAccess(ctx, "PRIVATE_EQUITY")) missingModules.push("Private Equity");
  if (!canAccess(ctx, "FUND_LP")) missingModules.push("Fund LP");
  if (missingModules.length > 0) {
    footnotes.push(`Excluded sources (no module access): ${missingModules.join(", ")}.`);
  }

  return {
    ...baseResult(
      "total-portfolio-income",
      "Total Portfolio Income",
      "Combined rental and investment income for the selected period.",
      entityName,
    ),
    metrics: [
      { label: "Grand Total", value: formatAmount(summary.grandTotalOmr, "OMR") },
      { label: "Rental Income", value: formatAmount(summary.rentalTotalOmr, "OMR") },
      {
        label: "Investment Income",
        value: formatAmount(summary.investmentIncomeTotalOmr, "OMR"),
      },
      { label: "Income Subtotal", value: formatAmount(summary.incomeSubtotalOmr, "OMR") },
    ],
    columns: [
      { key: "date", label: "Date" },
      { key: "category", label: "Category" },
      { key: "entity", label: "Entity" },
      { key: "source", label: "Source" },
      { key: "detail", label: "Detail" },
      { key: "amountOmr", label: "Amount (OMR)", align: "right" },
    ],
    rows,
    footnotes,
  };
}
