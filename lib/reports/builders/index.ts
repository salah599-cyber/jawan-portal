import { db } from "@/lib/db";
import { MSX_PORTFOLIO_ASSET_NAME } from "@/lib/msx/constants";
import { ensurePeSchema } from "@/lib/db/ensure-pe-schema";
import { getPePortfolioSummary, listPeCompanies } from "@/lib/data/pe-portfolio";
import {
  ASSET_CATEGORY_LABELS,
  ASSET_STATUS_LABELS,
  CHEQUE_DIRECTION_LABELS,
  CHEQUE_STATUS_LABELS,
  DOCUMENT_STATUS_LABELS,
  EXIT_TYPE_LABELS,
  EXPENSE_STATUS_LABELS,
  LIABILITY_TYPE_LABELS,
  PROPOSAL_STATUS_LABELS,
} from "@/lib/labels";
import { getModulePermission, canAccess } from "@/lib/permissions/access";
import { applyPeCarryingDelta } from "@/lib/pe/portfolio-rollup";
import {
  assetEntityFilter,
  carEntityFilter,
  chequeEntityFilter,
  companyEntityFilter,
  documentFilter,
  expenseEntityFilter,
  landEntityFilter,
  loanEntityFilter,
  peCompanyEntityFilter,
  proposalEntityFilter,
} from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";
import {
  convertToOmr,
  entityWhere,
  formatAmount,
  formatDateValue,
  parseDateRange,
  resolveEntityName,
  toNumber,
  weightedValue,
} from "@/lib/reports/helpers";
import type { ReportId, ReportParams, ReportResult } from "@/lib/reports/types";

const COUNTABLE_ASSET_STATUSES = ["ACTIVE", "MONITOR"] as const;

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

function liabilityEntityFilter(ctx: UserContext) {
  return assetEntityFilter(ctx);
}

export async function buildNetWorthReport(
  ctx: UserContext,
  params: ReportParams,
): Promise<ReportResult> {
  const entityName = await resolveEntityName(params.entityId);
  const assets = await db.asset.findMany({
    where: {
      ...entityWhere(params.entityId, assetEntityFilter(ctx)),
      status: { in: [...COUNTABLE_ASSET_STATUSES] },
    },
    select: { id: true, currentValue: true, currency: true, ownershipPct: true },
  });

  const liabilities = await db.liability.findMany({
    where: {
      ...entityWhere(params.entityId, liabilityEntityFilter(ctx)),
      status: "ACTIVE",
    },
    select: { amount: true, outstandingBalance: true, currency: true },
  });

  const portfolioMap = new Map<string, number>();
  const liabilityMap = new Map<string, number>();
  const assetValuesById = new Map<string, number>();

  for (const asset of assets) {
    const value = weightedValue(asset.currentValue, asset.ownershipPct);
    assetValuesById.set(asset.id, value);
    if (value > 0) {
      portfolioMap.set(asset.currency, (portfolioMap.get(asset.currency) ?? 0) + value);
    }
  }

  if (canAccess(ctx, "PRIVATE_EQUITY")) {
    await ensurePeSchema();
    const peCompanies = await listPeCompanies(ctx, params.entityId);
    applyPeCarryingDelta(peCompanies, assetValuesById, (currency, delta) => {
      portfolioMap.set(currency, (portfolioMap.get(currency) ?? 0) + delta);
    });
  }

  for (const liability of liabilities) {
    const balance = toNumber(liability.outstandingBalance) ?? toNumber(liability.amount) ?? 0;
    if (balance > 0) {
      liabilityMap.set(liability.currency, (liabilityMap.get(liability.currency) ?? 0) + balance);
    }
  }

  const currencies = new Set([...portfolioMap.keys(), ...liabilityMap.keys()]);
  const rows = [...currencies].sort().map((currency) => {
    const portfolio = portfolioMap.get(currency) ?? 0;
    const liability = liabilityMap.get(currency) ?? 0;
    return {
      currency,
      portfolio: formatAmount(portfolio, currency),
      liabilities: formatAmount(liability, currency),
      netWorth: formatAmount(portfolio - liability, currency),
    };
  });

  const totalPortfolio = [...portfolioMap.values()].reduce((sum, v) => sum + v, 0);
  const totalLiabilities = [...liabilityMap.values()].reduce((sum, v) => sum + v, 0);

  return {
    ...baseResult(
      "net-worth",
      "Net Worth Statement",
      "Portfolio value minus active liabilities, shown per currency.",
      entityName,
    ),
    metrics: [
      { label: "Asset count", value: assets.length.toString() },
      { label: "Liability count", value: liabilities.length.toString() },
      {
        label: "Currencies",
        value: currencies.size.toString(),
        detail: "Values are not FX-converted across currencies",
      },
    ],
    columns: [
      { key: "currency", label: "Currency" },
      { key: "portfolio", label: "Portfolio Value", align: "right" },
      { key: "liabilities", label: "Liabilities", align: "right" },
      { key: "netWorth", label: "Net Worth", align: "right" },
    ],
    rows,
    footnotes: [
      "Portfolio values are ownership-adjusted.",
      "Private equity carrying values use the latest fair value, or invested capital when no valuation is recorded.",
      "Multi-currency totals are not summed without FX conversion — use Consolidated Net Worth (OMR) for a single-currency view.",
    ],
  };
}

export async function buildConsolidatedOmrReport(
  ctx: UserContext,
  params: ReportParams,
): Promise<ReportResult> {
  const entityName = await resolveEntityName(params.entityId);
  const assets = await db.asset.findMany({
    where: {
      ...entityWhere(params.entityId, assetEntityFilter(ctx)),
      status: { in: [...COUNTABLE_ASSET_STATUSES] },
    },
    select: { id: true, currentValue: true, currency: true, ownershipPct: true, category: true },
  });

  const liabilities = await db.liability.findMany({
    where: {
      ...entityWhere(params.entityId, liabilityEntityFilter(ctx)),
      status: "ACTIVE",
    },
    select: { amount: true, outstandingBalance: true, currency: true },
  });

  let portfolioOmr = 0;
  let liabilitiesOmr = 0;
  const categoryTotals = new Map<string, number>();
  const assetValuesById = new Map<string, number>();

  for (const asset of assets) {
    const value = weightedValue(asset.currentValue, asset.ownershipPct);
    assetValuesById.set(asset.id, value);
    if (value <= 0) continue;
    const omr = await convertToOmr(value, asset.currency);
    portfolioOmr += omr;
    const label = ASSET_CATEGORY_LABELS[asset.category] ?? asset.category;
    categoryTotals.set(label, (categoryTotals.get(label) ?? 0) + omr);
  }

  if (canAccess(ctx, "PRIVATE_EQUITY")) {
    await ensurePeSchema();
    const peCompanies = await listPeCompanies(ctx, params.entityId);
    const peDeltas: Array<{ currency: string; amount: number }> = [];
    applyPeCarryingDelta(peCompanies, assetValuesById, (currency, delta) => {
      peDeltas.push({ currency, amount: delta });
    });
    for (const { currency, amount } of peDeltas) {
      const omr = await convertToOmr(amount, currency);
      portfolioOmr += omr;
      const label = ASSET_CATEGORY_LABELS.PRIVATE_EQUITY;
      categoryTotals.set(label, (categoryTotals.get(label) ?? 0) + omr);
    }
  }

  for (const liability of liabilities) {
    const balance = toNumber(liability.outstandingBalance) ?? toNumber(liability.amount) ?? 0;
    if (balance <= 0) continue;
    liabilitiesOmr += await convertToOmr(balance, liability.currency);
  }

  const rows = [...categoryTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, amountOmr]) => ({
      category,
      valueOmr: formatAmount(amountOmr, "OMR"),
      sharePct:
        portfolioOmr > 0
          ? `${((amountOmr / portfolioOmr) * 100).toFixed(1)}%`
          : "0%",
    }));

  return {
    ...baseResult(
      "consolidated-omr",
      "Consolidated Net Worth (OMR)",
      "Assets and liabilities converted to OMR using latest FX rates.",
      entityName,
    ),
    metrics: [
      { label: "Portfolio (OMR)", value: formatAmount(portfolioOmr, "OMR") },
      { label: "Liabilities (OMR)", value: formatAmount(liabilitiesOmr, "OMR") },
      { label: "Net Worth (OMR)", value: formatAmount(portfolioOmr - liabilitiesOmr, "OMR") },
    ],
    columns: [
      { key: "category", label: "Category" },
      { key: "valueOmr", label: "Value (OMR)", align: "right" },
      { key: "sharePct", label: "Share", align: "right" },
    ],
    rows,
    footnotes: [
      "FX rates from FxRate table when available, otherwise fallback rates.",
      "Portfolio values are ownership-adjusted before conversion.",
    ],
  };
}

export async function buildAssetRegisterReport(
  ctx: UserContext,
  params: ReportParams,
): Promise<ReportResult> {
  const entityName = await resolveEntityName(params.entityId);
  const assets = await db.asset.findMany({
    where: {
      ...entityWhere(params.entityId, assetEntityFilter(ctx)),
      status: { in: [...COUNTABLE_ASSET_STATUSES] },
    },
    include: { entity: { select: { name: true } } },
    orderBy: [{ entity: { name: "asc" } }, { category: "asc" }, { name: "asc" }],
  });

  const rows = assets.map((asset) => {
    const value = weightedValue(asset.currentValue, asset.ownershipPct);
    return {
      entity: asset.entity.name,
      name: asset.name,
      category: ASSET_CATEGORY_LABELS[asset.category] ?? asset.category,
      status: ASSET_STATUS_LABELS[asset.status] ?? asset.status,
      ownershipPct: `${toNumber(asset.ownershipPct)?.toFixed(1) ?? "0"}%`,
      value: formatAmount(value, asset.currency),
      currency: asset.currency,
      acquisitionDate: formatDateValue(asset.acquisitionDate),
    };
  });

  return {
    ...baseResult(
      "asset-register",
      "Asset Register",
      "Active and monitored assets with ownership-adjusted values.",
      entityName,
    ),
    metrics: [{ label: "Assets", value: assets.length.toString() }],
    columns: [
      { key: "entity", label: "Entity" },
      { key: "name", label: "Asset" },
      { key: "category", label: "Category" },
      { key: "status", label: "Status" },
      { key: "ownershipPct", label: "Ownership", align: "right" },
      { key: "value", label: "Value", align: "right" },
      { key: "currency", label: "Currency" },
      { key: "acquisitionDate", label: "Acquired" },
    ],
    rows,
    footnotes: ["Values reflect ownership percentage."],
  };
}

export async function buildAssetAllocationReport(
  ctx: UserContext,
  params: ReportParams,
): Promise<ReportResult> {
  const entityName = await resolveEntityName(params.entityId);
  const assets = await db.asset.findMany({
    where: {
      ...entityWhere(params.entityId, assetEntityFilter(ctx)),
      status: { in: [...COUNTABLE_ASSET_STATUSES] },
    },
    select: { id: true, category: true, currentValue: true, currency: true, ownershipPct: true },
  });

  const totals = new Map<string, { count: number; value: number; currency: string }>();
  const assetValuesById = new Map<string, number>();

  for (const asset of assets) {
    const label = ASSET_CATEGORY_LABELS[asset.category] ?? asset.category;
    const value = weightedValue(asset.currentValue, asset.ownershipPct);
    assetValuesById.set(asset.id, value);
    const entry = totals.get(label) ?? { count: 0, value: 0, currency: asset.currency };
    entry.count += 1;
    entry.value += value;
    totals.set(label, entry);
  }

  if (canAccess(ctx, "PRIVATE_EQUITY")) {
    await ensurePeSchema();
    const peCompanies = await listPeCompanies(ctx, params.entityId);
    applyPeCarryingDelta(peCompanies, assetValuesById, (currency, delta) => {
      const label = ASSET_CATEGORY_LABELS.PRIVATE_EQUITY;
      const entry = totals.get(label) ?? { count: 0, value: 0, currency };
      entry.value += delta;
      totals.set(label, entry);
    });
  }

  const grandTotal = [...totals.values()].reduce((sum, entry) => sum + entry.value, 0);

  const rows = [...totals.entries()]
    .sort((a, b) => b[1].value - a[1].value)
    .map(([category, entry]) => ({
      category,
      count: entry.count,
      totalValue: formatAmount(entry.value, entry.currency),
      sharePct: grandTotal > 0 ? `${((entry.value / grandTotal) * 100).toFixed(1)}%` : "0%",
    }));

  return {
    ...baseResult(
      "asset-allocation",
      "Asset Allocation",
      "Portfolio breakdown by asset category.",
      entityName,
    ),
    metrics: [
      { label: "Categories", value: totals.size.toString() },
      { label: "Total assets", value: assets.length.toString() },
    ],
    columns: [
      { key: "category", label: "Category" },
      { key: "count", label: "Count", align: "right" },
      { key: "totalValue", label: "Total Value", align: "right" },
      { key: "sharePct", label: "Share", align: "right" },
    ],
    rows,
    footnotes: [
      "Allocation uses native currency per category; not FX-converted.",
      "Private equity carrying values use the latest fair value, or invested capital when no valuation is recorded.",
    ],
  };
}

export async function buildLiabilitiesReport(
  ctx: UserContext,
  params: ReportParams,
): Promise<ReportResult> {
  const entityName = await resolveEntityName(params.entityId);
  const liabilities = await db.liability.findMany({
    where: {
      ...entityWhere(params.entityId, loanEntityFilter(ctx)),
      status: "ACTIVE",
    },
    include: { entity: { select: { name: true } } },
    orderBy: [{ maturityDate: "asc" }, { name: "asc" }],
  });

  const rows = liabilities.map((liability) => ({
    entity: liability.entity.name,
    name: liability.name,
    type: LIABILITY_TYPE_LABELS[liability.type] ?? liability.type,
    lender: liability.lender ?? "—",
    outstanding: formatAmount(
      toNumber(liability.outstandingBalance) ?? toNumber(liability.amount),
      liability.currency,
    ),
    interestRate: liability.interestRate ? `${toNumber(liability.interestRate)}%` : "—",
    maturityDate: formatDateValue(liability.maturityDate),
    currency: liability.currency,
  }));

  return {
    ...baseResult(
      "liabilities",
      "Liability & Loan Schedule",
      "Active liabilities with outstanding balances.",
      entityName,
    ),
    metrics: [{ label: "Active liabilities", value: liabilities.length.toString() }],
    columns: [
      { key: "entity", label: "Entity" },
      { key: "name", label: "Facility" },
      { key: "type", label: "Type" },
      { key: "lender", label: "Lender" },
      { key: "outstanding", label: "Outstanding", align: "right" },
      { key: "interestRate", label: "Rate", align: "right" },
      { key: "maturityDate", label: "Maturity" },
      { key: "currency", label: "Currency" },
    ],
    rows,
    footnotes: [],
  };
}

export async function buildPublicEquityReport(
  ctx: UserContext,
  params: ReportParams,
): Promise<ReportResult> {
  const entityName = await resolveEntityName(params.entityId);
  const assets = await db.asset.findMany({
    where: {
      ...entityWhere(params.entityId, assetEntityFilter(ctx)),
      category: "PUBLIC_EQUITY",
      status: { in: [...COUNTABLE_ASSET_STATUSES] },
    },
    select: { id: true, name: true, entity: { select: { name: true } } },
  });

  if (assets.length === 0) {
    return {
      ...baseResult(
        "public-equity",
        "Public Equity Holdings",
        "Listed equity positions across imported broker reports.",
        entityName,
      ),
      metrics: [{ label: "Holdings", value: "0" }],
      columns: [
        { key: "entity", label: "Entity" },
        { key: "portfolio", label: "Portfolio" },
        { key: "symbol", label: "Symbol" },
        { key: "name", label: "Security" },
        { key: "quantity", label: "Quantity", align: "right" },
        { key: "marketValue", label: "Market Value", align: "right" },
        { key: "broker", label: "Broker" },
      ],
      rows: [],
      footnotes: [],
    };
  }

  const holdings = await db.publicEquityHolding.findMany({
    where: { assetId: { in: assets.map((asset) => asset.id) } },
    include: { asset: { select: { name: true, entity: { select: { name: true } } } } },
    orderBy: [{ asset: { name: "asc" } }, { symbol: "asc" }],
  });

  const rows = holdings.map((holding) => ({
    entity: holding.asset.entity.name,
    portfolio: holding.asset.name,
    symbol: holding.symbol,
    name: holding.name ?? "—",
    quantity: toNumber(holding.quantity)?.toLocaleString("en-OM") ?? "—",
    marketValue: formatAmount(toNumber(holding.marketValue), holding.currency),
    costBasis: formatAmount(toNumber(holding.costBasis), holding.currency),
    unrealisedPnl: formatAmount(toNumber(holding.unrealisedPnl), holding.currency),
    broker: holding.broker ?? "—",
    asOfDate: formatDateValue(holding.asOfDate),
  }));

  return {
    ...baseResult(
      "public-equity",
      "Public Equity Holdings",
      "Listed equity positions across imported broker reports.",
      entityName,
    ),
    metrics: [{ label: "Holdings", value: holdings.length.toString() }],
    columns: [
      { key: "entity", label: "Entity" },
      { key: "portfolio", label: "Portfolio" },
      { key: "symbol", label: "Symbol" },
      { key: "name", label: "Security" },
      { key: "quantity", label: "Quantity", align: "right" },
      { key: "marketValue", label: "Market Value", align: "right" },
      { key: "costBasis", label: "Cost Basis", align: "right" },
      { key: "unrealisedPnl", label: "Unrealised P&L", align: "right" },
      { key: "broker", label: "Broker" },
      { key: "asOfDate", label: "As Of" },
    ],
    rows,
    footnotes: [`Includes MSX and other public equity portfolios (e.g. ${MSX_PORTFOLIO_ASSET_NAME}).`],
  };
}

export async function buildPePortfolioReport(
  ctx: UserContext,
  params: ReportParams,
): Promise<ReportResult> {
  await ensurePeSchema();
  const entityName = await resolveEntityName(params.entityId);
  const [summary, companies] = await Promise.all([
    getPePortfolioSummary(ctx, params.entityId),
    listPeCompanies(ctx, params.entityId),
  ]);

  const rows = companies.map((company) => ({
    entity: company.entityName,
    company: company.name,
    stage: company.stage,
    status: company.status,
    invested: formatAmount(company.totalInvested, company.reportingCurrency),
    fairValue: formatAmount(company.latestFairValue, company.reportingCurrency),
    distributed: formatAmount(company.totalDistributed, company.reportingCurrency),
    currency: company.reportingCurrency,
  }));

  return {
    ...baseResult(
      "pe-portfolio",
      "PE / VC Portfolio Summary",
      "Private equity companies with invested capital and fair value.",
      entityName ?? summary?.entityName,
    ),
    metrics: summary
      ? [
          { label: "Companies", value: summary.companyCount.toString() },
          { label: "Total invested", value: formatAmount(summary.totalInvested, summary.reportingCurrency) },
          { label: "Fair value", value: formatAmount(summary.totalFairValue, summary.reportingCurrency) },
          { label: "Unrealised gain", value: formatAmount(summary.unrealisedGain, summary.reportingCurrency) },
        ]
      : [{ label: "Companies", value: "0" }],
    columns: [
      { key: "entity", label: "Entity" },
      { key: "company", label: "Company" },
      { key: "stage", label: "Stage" },
      { key: "status", label: "Status" },
      { key: "invested", label: "Invested", align: "right" },
      { key: "fairValue", label: "Fair Value", align: "right" },
      { key: "distributed", label: "Distributed", align: "right" },
      { key: "currency", label: "Currency" },
    ],
    rows,
    footnotes: ["Amounts in each company's reporting currency."],
  };
}

export async function buildChequesReport(
  ctx: UserContext,
  params: ReportParams,
): Promise<ReportResult> {
  const entityName = await resolveEntityName(params.entityId);
  const { from, to } = parseDateRange(params);

  const cheques = await db.cheque.findMany({
    where: {
      ...entityWhere(params.entityId, chequeEntityFilter(ctx)),
      ...(from || to
        ? {
            issueDate: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    include: { entity: { select: { name: true } } },
    orderBy: [{ dueDate: "asc" }, { issueDate: "desc" }],
  });

  const rows = cheques.map((cheque) => ({
    entity: cheque.entity.name,
    direction: CHEQUE_DIRECTION_LABELS[cheque.direction] ?? cheque.direction,
    status: CHEQUE_STATUS_LABELS[cheque.status] ?? cheque.status,
    chequeNumber: cheque.chequeNumber,
    payee: cheque.payee,
    amount: formatAmount(toNumber(cheque.amount), cheque.currency),
    issueDate: formatDateValue(cheque.issueDate),
    dueDate: formatDateValue(cheque.dueDate),
    bankName: cheque.bankName ?? "—",
  }));

  return {
    ...baseResult(
      "cheques",
      "Cheque Register",
      "Cheques with status, amounts, and due dates.",
      entityName,
    ),
    metrics: [{ label: "Cheques", value: cheques.length.toString() }],
    columns: [
      { key: "entity", label: "Entity" },
      { key: "direction", label: "Direction" },
      { key: "status", label: "Status" },
      { key: "chequeNumber", label: "Cheque #" },
      { key: "payee", label: "Payee" },
      { key: "amount", label: "Amount", align: "right" },
      { key: "issueDate", label: "Issued" },
      { key: "dueDate", label: "Due" },
      { key: "bankName", label: "Bank" },
    ],
    rows,
    footnotes: [],
  };
}

export async function buildExpensesReport(
  ctx: UserContext,
  params: ReportParams,
): Promise<ReportResult> {
  const { from, to } = parseDateRange(params);
  const defaultFrom = from ?? new Date(new Date().getFullYear(), 0, 1);

  const expenses = await db.expense.findMany({
    where: {
      ...expenseEntityFilter(ctx),
      ...(to || defaultFrom
        ? {
            OR: [
              { dueDate: { gte: defaultFrom, ...(to ? { lte: to } : {}) } },
              { nextDueDate: { gte: defaultFrom, ...(to ? { lte: to } : {}) } },
              { createdAt: { gte: defaultFrom, ...(to ? { lte: to } : {}) } },
            ],
          }
        : {}),
    },
    include: { entity: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });

  const rows = expenses.map((expense) => ({
    entity: expense.entity?.name ?? "—",
    title: expense.title,
    category: expense.category,
    status: EXPENSE_STATUS_LABELS[expense.status] ?? expense.status,
    amount: formatAmount(toNumber(expense.amount), expense.currency),
    dueDate: formatDateValue(expense.dueDate ?? expense.nextDueDate),
    recurring: expense.isRecurring ? "Yes" : "No",
  }));

  const totalOmr = expenses.reduce((sum, expense) => sum + (toNumber(expense.amount) ?? 0), 0);

  return {
    ...baseResult(
      "expenses",
      "Expense Summary",
      "Expenses by category and status.",
      undefined,
    ),
    metrics: [
      { label: "Expenses", value: expenses.length.toString() },
      { label: "Total (mixed currency)", value: formatAmount(totalOmr) },
    ],
    columns: [
      { key: "entity", label: "Entity" },
      { key: "title", label: "Title" },
      { key: "category", label: "Category" },
      { key: "status", label: "Status" },
      { key: "amount", label: "Amount", align: "right" },
      { key: "dueDate", label: "Due" },
      { key: "recurring", label: "Recurring" },
    ],
    rows,
    footnotes: ["Default period is year-to-date when no date range is selected."],
  };
}

export async function buildExitsReport(
  ctx: UserContext,
  params: ReportParams,
): Promise<ReportResult> {
  const entityName = await resolveEntityName(params.entityId);
  const { from, to } = parseDateRange(params);
  const defaultFrom = from ?? new Date(new Date().setMonth(new Date().getMonth() - 12));

  const exits = await db.assetExit.findMany({
    where: {
      exitDate: { gte: defaultFrom, ...(to ? { lte: to } : {}) },
      asset: entityWhere(params.entityId, assetEntityFilter(ctx)),
    },
    include: {
      asset: {
        select: {
          name: true,
          category: true,
          entity: { select: { name: true } },
        },
      },
    },
    orderBy: { exitDate: "desc" },
  });

  const rows = exits.map((exit) => ({
    entity: exit.asset.entity.name,
    asset: exit.asset.name,
    category: ASSET_CATEGORY_LABELS[exit.asset.category] ?? exit.asset.category,
    exitType: EXIT_TYPE_LABELS[exit.exitType] ?? exit.exitType,
    exitDate: formatDateValue(exit.exitDate),
    proceeds: formatAmount(toNumber(exit.proceeds), exit.currency),
    realizedGain: formatAmount(toNumber(exit.realizedGain), exit.currency),
    counterparty: exit.counterparty ?? "—",
  }));

  return {
    ...baseResult(
      "exits",
      "Realized Exits",
      "Asset exits with proceeds and realized gains.",
      entityName,
    ),
    metrics: [{ label: "Exits", value: exits.length.toString() }],
    columns: [
      { key: "entity", label: "Entity" },
      { key: "asset", label: "Asset" },
      { key: "category", label: "Category" },
      { key: "exitType", label: "Exit Type" },
      { key: "exitDate", label: "Exit Date" },
      { key: "proceeds", label: "Proceeds", align: "right" },
      { key: "realizedGain", label: "Realized Gain", align: "right" },
      { key: "counterparty", label: "Counterparty" },
    ],
    rows,
    footnotes: ["Default period is last 12 months when no date range is selected."],
  };
}

export async function buildLandsReport(
  ctx: UserContext,
  params: ReportParams,
): Promise<ReportResult> {
  const entityName = await resolveEntityName(params.entityId);
  const lands = await db.landParcel.findMany({
    where: entityWhere(params.entityId, landEntityFilter(ctx)),
    include: { entity: { select: { name: true } } },
    orderBy: [{ entity: { name: "asc" } }, { name: "asc" }],
  });

  const rows = lands.map((land) => ({
    entity: land.entity.name,
    name: land.name,
    location: [land.governorate, land.wilayat, land.city].filter(Boolean).join(", ") || land.country,
    landUse: land.landUse ?? "—",
    areaSqm: toNumber(land.areaSqm)?.toLocaleString("en-OM") ?? "—",
    currentValue: formatAmount(
      weightedValue(land.currentValue, land.ownershipPct),
      land.currency,
    ),
    status: ASSET_STATUS_LABELS[land.status] ?? land.status,
  }));

  return {
    ...baseResult("lands", "Land Portfolio", "Land parcels with location and values.", entityName),
    metrics: [{ label: "Parcels", value: lands.length.toString() }],
    columns: [
      { key: "entity", label: "Entity" },
      { key: "name", label: "Parcel" },
      { key: "location", label: "Location" },
      { key: "landUse", label: "Use" },
      { key: "areaSqm", label: "Area (sqm)", align: "right" },
      { key: "currentValue", label: "Value", align: "right" },
      { key: "status", label: "Status" },
    ],
    rows,
    footnotes: [],
  };
}

export async function buildVehiclesReport(
  ctx: UserContext,
  params: ReportParams,
): Promise<ReportResult> {
  const entityName = await resolveEntityName(params.entityId);
  const vehicles = await db.vehicle.findMany({
    where: entityWhere(params.entityId, carEntityFilter(ctx)),
    include: { entity: { select: { name: true } } },
    orderBy: [{ entity: { name: "asc" } }, { make: "asc" }],
  });

  const rows = vehicles.map((vehicle) => ({
    entity: vehicle.entity.name,
    vehicle: [vehicle.make, vehicle.model, vehicle.modelYear].filter(Boolean).join(" "),
    plateNumber: vehicle.plateNumber ?? "—",
    registrationExpiry: formatDateValue(vehicle.registrationExpiryDate),
    insuranceExpiry: formatDateValue(vehicle.insuranceExpiryDate),
    currentValue: formatAmount(toNumber(vehicle.currentValue), vehicle.currency),
    status: ASSET_STATUS_LABELS[vehicle.status] ?? vehicle.status,
  }));

  return {
    ...baseResult(
      "vehicles",
      "Vehicle Fleet",
      "Registered vehicles with expiry dates.",
      entityName,
    ),
    metrics: [{ label: "Vehicles", value: vehicles.length.toString() }],
    columns: [
      { key: "entity", label: "Entity" },
      { key: "vehicle", label: "Vehicle" },
      { key: "plateNumber", label: "Plate" },
      { key: "registrationExpiry", label: "Registration Expiry" },
      { key: "insuranceExpiry", label: "Insurance Expiry" },
      { key: "currentValue", label: "Value", align: "right" },
      { key: "status", label: "Status" },
    ],
    rows,
    footnotes: [],
  };
}

export async function buildCompaniesReport(
  ctx: UserContext,
  params: ReportParams,
): Promise<ReportResult> {
  const entityName = await resolveEntityName(params.entityId);
  const companies = await db.registeredCompany.findMany({
    where: entityWhere(params.entityId, companyEntityFilter(ctx)),
    include: { entity: { select: { name: true } } },
    orderBy: [{ entity: { name: "asc" } }, { name: "asc" }],
  });

  const rows = companies.map((company) => ({
    entity: company.entity.name,
    name: company.name,
    registrationNumber: company.registrationNumber,
    ceo: company.ceoName ?? "—",
    registrationExpiry: formatDateValue(company.registrationExpiryDate),
    status: ASSET_STATUS_LABELS[company.status] ?? company.status,
  }));

  return {
    ...baseResult(
      "companies",
      "Registered Companies",
      "Corporate entities with registration details.",
      entityName,
    ),
    metrics: [{ label: "Companies", value: companies.length.toString() }],
    columns: [
      { key: "entity", label: "Entity" },
      { key: "name", label: "Company" },
      { key: "registrationNumber", label: "Registration #" },
      { key: "ceo", label: "CEO" },
      { key: "registrationExpiry", label: "Expiry" },
      { key: "status", label: "Status" },
    ],
    rows,
    footnotes: [],
  };
}

export async function buildDocumentExpiryReport(
  ctx: UserContext,
  _params: ReportParams,
): Promise<ReportResult> {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 90);

  const documents = await db.document.findMany({
    where: {
      ...documentFilter(ctx),
      expiryDate: { not: null, lte: horizon },
    },
    include: { category: { select: { name: true } } },
    orderBy: { expiryDate: "asc" },
  });

  const rows = documents.map((document) => ({
    document: document.name,
    category: document.category.name,
    status: DOCUMENT_STATUS_LABELS[document.status] ?? document.status,
    expiryDate: formatDateValue(document.expiryDate),
    fileName: document.fileName,
  }));

  return {
    ...baseResult(
      "document-expiry",
      "Document Expiry",
      "Documents expiring within 90 days or already expired.",
      undefined,
    ),
    metrics: [{ label: "Documents", value: documents.length.toString() }],
    columns: [
      { key: "document", label: "Document" },
      { key: "category", label: "Category" },
      { key: "status", label: "Status" },
      { key: "expiryDate", label: "Expiry" },
      { key: "fileName", label: "File" },
    ],
    rows,
    footnotes: ["Shows documents expiring within the next 90 days."],
  };
}

export async function buildBankAccountsReport(
  ctx: UserContext,
  params: ReportParams,
): Promise<ReportResult> {
  const entityName = await resolveEntityName(params.entityId);
  const level = getModulePermission(ctx, "ASSETS");
  const bankFilter =
    level === "FULL" || level === "READ"
      ? {}
      : level === "FILTERED"
        ? { entityId: { in: ctx.entityIds } }
        : { id: "__none__" };

  const accounts = await db.bankAccount.findMany({
    where: {
      ...bankFilter,
      ...(params.entityId ? { entityId: params.entityId } : {}),
    },
    include: { entity: { select: { name: true } } },
    orderBy: [{ entity: { name: "asc" } }, { bankName: "asc" }],
  });

  const rows = accounts.map((account) => ({
    entity: account.entity?.name ?? "—",
    bankName: account.bankName,
    accountName: account.accountName,
    accountNumber: account.accountNumber ?? "—",
    iban: account.iban ?? "—",
    currency: account.currency,
    swiftCode: account.swiftCode ?? "—",
  }));

  return {
    ...baseResult(
      "bank-accounts",
      "Bank Accounts",
      "Registered bank accounts across entities.",
      entityName,
    ),
    metrics: [{ label: "Accounts", value: accounts.length.toString() }],
    columns: [
      { key: "entity", label: "Entity" },
      { key: "bankName", label: "Bank" },
      { key: "accountName", label: "Account Name" },
      { key: "accountNumber", label: "Account #" },
      { key: "iban", label: "IBAN" },
      { key: "currency", label: "Currency" },
      { key: "swiftCode", label: "SWIFT" },
    ],
    rows,
    footnotes: ["Reference list only — balances are not tracked."],
  };
}

export async function buildProposalsReport(
  ctx: UserContext,
  params: ReportParams,
): Promise<ReportResult> {
  const entityName = await resolveEntityName(params.entityId);
  const { from, to } = parseDateRange(params);

  const proposals = await db.investmentProposal.findMany({
    where: {
      ...proposalEntityFilter(ctx),
      ...(params.entityId ? { entityId: params.entityId } : {}),
      ...(from || to
        ? {
            submittedAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    include: { entity: { select: { name: true } } },
    orderBy: { submittedAt: "desc" },
  });

  const rows = proposals.map((proposal) => ({
    entity: proposal.entity?.name ?? "—",
    name: proposal.name,
    status: PROPOSAL_STATUS_LABELS[proposal.status] ?? proposal.status,
    amount: formatAmount(toNumber(proposal.suggestedAmount), proposal.currency),
    submittedAt: formatDateValue(proposal.submittedAt),
    currency: proposal.currency,
  }));

  return {
    ...baseResult(
      "proposals",
      "Investment Proposal Pipeline",
      "Investment proposals by status and amount.",
      entityName,
    ),
    metrics: [{ label: "Proposals", value: proposals.length.toString() }],
    columns: [
      { key: "entity", label: "Entity" },
      { key: "name", label: "Proposal" },
      { key: "status", label: "Status" },
      { key: "amount", label: "Amount", align: "right" },
      { key: "submittedAt", label: "Submitted" },
      { key: "currency", label: "Currency" },
    ],
    rows,
    footnotes: [],
  };
}

export async function buildValuationHistoryReport(
  ctx: UserContext,
  params: ReportParams,
): Promise<ReportResult> {
  const entityName = await resolveEntityName(params.entityId);
  const { from, to } = parseDateRange(params);
  const defaultFrom = from ?? new Date(new Date().setFullYear(new Date().getFullYear() - 2));

  const valuations = await db.assetValuation.findMany({
    where: {
      valuedAt: { gte: defaultFrom, ...(to ? { lte: to } : {}) },
      asset: entityWhere(params.entityId, assetEntityFilter(ctx)),
    },
    include: {
      asset: {
        select: {
          name: true,
          category: true,
          entity: { select: { name: true } },
        },
      },
    },
    orderBy: [{ valuedAt: "desc" }, { asset: { name: "asc" } }],
  });

  const rows = valuations.map((valuation) => ({
    entity: valuation.asset.entity.name,
    asset: valuation.asset.name,
    category: ASSET_CATEGORY_LABELS[valuation.asset.category] ?? valuation.asset.category,
    valuedAt: formatDateValue(valuation.valuedAt),
    value: formatAmount(toNumber(valuation.value), valuation.currency),
    notes: valuation.notes ?? "—",
  }));

  return {
    ...baseResult(
      "valuation-history",
      "Valuation History",
      "Historical asset valuations over time.",
      entityName,
    ),
    metrics: [{ label: "Valuations", value: valuations.length.toString() }],
    columns: [
      { key: "entity", label: "Entity" },
      { key: "asset", label: "Asset" },
      { key: "category", label: "Category" },
      { key: "valuedAt", label: "Valuation Date" },
      { key: "value", label: "Value", align: "right" },
      { key: "notes", label: "Notes" },
    ],
    rows,
    footnotes: [
      "Valuations are recorded when asset values are updated.",
      "Default period is last 2 years when no date range is selected.",
    ],
  };
}
