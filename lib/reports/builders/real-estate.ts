import { db } from "@/lib/db";
import { getPortfolioSummary, listProperties } from "@/lib/data/real-estate";
import {
  RE_LEASE_STATUS_LABELS,
  RE_PAYMENT_FREQUENCY_LABELS,
  RE_PAYMENT_METHOD_LABELS,
  RE_PROPERTY_EXPENSE_CATEGORY_LABELS,
  RE_PROPERTY_STATUS_LABELS,
  RE_PROPERTY_TYPE_LABELS,
  RE_RENT_PAYMENT_STATUS_LABELS,
  RE_VALUATION_METHOD_LABELS,
} from "@/lib/labels";
import { rePropertyEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";
import {
  entityWhere,
  formatAmount,
  formatDateValue,
  parseDateRange,
  resolveEntityName,
  toNumber,
} from "@/lib/reports/helpers";
import type { ReportId, ReportParams, ReportResult } from "@/lib/reports/types";

const RE_EXPENSE_PAYMENT_STATUS_LABELS: Record<string, string> = {
  PAID: "Paid",
  UNPAID: "Unpaid",
  OVERDUE: "Overdue",
};

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

function formatPct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(1)}%`;
}

export async function buildRePortfolioReport(
  ctx: UserContext,
  params: ReportParams,
): Promise<ReportResult> {
  const entityName = await resolveEntityName(params.entityId);
  const [properties, summary] = await Promise.all([
    listProperties(ctx, params.entityId ? { entityId: params.entityId } : undefined),
    getPortfolioSummary(ctx, params.entityId),
  ]);

  const rows = properties.map((property) => ({
    entity: property.entityName,
    name: property.name,
    type: RE_PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType,
    location: [property.governorate, property.wilayat, property.area].filter(Boolean).join(", ") || "—",
    units: property.numUnits,
    occupied: property.occupiedUnits,
    occupancy: property.numUnits > 0 ? formatPct((property.occupiedUnits / property.numUnits) * 100) : "—",
    valuation: formatAmount(property.currentValuationOmr, "OMR"),
    grossRent: formatAmount(property.grossMonthlyRentOmr, "OMR"),
    yield: formatPct(property.grossYieldPct),
    overdue: formatAmount(property.overdueRentOmr, "OMR"),
    status: RE_PROPERTY_STATUS_LABELS[property.status] ?? property.status,
  }));

  return {
    ...baseResult(
      "re-portfolio",
      "Property Portfolio",
      "Real estate properties with occupancy, rent, and valuation metrics.",
      entityName,
    ),
    metrics: [
      { label: "Properties", value: summary.totalProperties.toString() },
      { label: "Portfolio Value", value: formatAmount(summary.totalPortfolioValueOmr, "OMR") },
      { label: "Occupancy", value: formatPct(summary.overallOccupancyPct) },
      { label: "Gross Monthly Rent", value: formatAmount(summary.totalGrossMonthlyRentOmr, "OMR") },
      { label: "Overdue Rent", value: formatAmount(summary.totalOverdueRentOmr, "OMR") },
    ],
    columns: [
      { key: "entity", label: "Entity" },
      { key: "name", label: "Property" },
      { key: "type", label: "Type" },
      { key: "location", label: "Location" },
      { key: "units", label: "Units", align: "right" },
      { key: "occupied", label: "Occupied", align: "right" },
      { key: "occupancy", label: "Occupancy", align: "right" },
      { key: "valuation", label: "Valuation", align: "right" },
      { key: "grossRent", label: "Gross Rent", align: "right" },
      { key: "yield", label: "Yield", align: "right" },
      { key: "overdue", label: "Overdue", align: "right" },
      { key: "status", label: "Status" },
    ],
    rows,
    footnotes: [],
  };
}

export async function buildReRentRegisterReport(
  ctx: UserContext,
  params: ReportParams,
): Promise<ReportResult> {
  const entityName = await resolveEntityName(params.entityId);
  const { from, to } = parseDateRange(params);
  const defaultFrom = from ?? new Date(new Date().getFullYear(), 0, 1);

  const schedules = await db.reRentSchedule.findMany({
    where: {
      unit: {
        property: entityWhere(params.entityId, rePropertyEntityFilter(ctx)),
      },
      dueDate: {
        gte: defaultFrom,
        ...(to ? { lte: to } : {}),
      },
    },
    include: {
      unit: {
        select: {
          unitNumber: true,
          property: {
            select: {
              name: true,
              entity: { select: { name: true } },
            },
          },
        },
      },
      lease: {
        include: {
          tenant: { select: { fullName: true } },
        },
      },
    },
    orderBy: [{ paymentStatus: "asc" }, { dueDate: "asc" }],
  });

  let totalDue = 0;
  let totalPaid = 0;
  let overdueCount = 0;

  const rows = schedules.map((schedule) => {
    const amountOmr = toNumber(schedule.amountOmr) ?? 0;
    const paidAmountOmr = toNumber(schedule.paidAmountOmr) ?? 0;
    const outstanding = amountOmr - paidAmountOmr;
    totalDue += amountOmr;
    totalPaid += paidAmountOmr;
    if (schedule.paymentStatus === "OVERDUE") overdueCount += 1;

    return {
      entity: schedule.unit.property.entity.name,
      property: schedule.unit.property.name,
      unit: schedule.unit.unitNumber,
      tenant: schedule.lease.tenant.fullName,
      period: schedule.periodLabel,
      dueDate: formatDateValue(schedule.dueDate),
      amount: formatAmount(amountOmr, "OMR"),
      paid: formatAmount(paidAmountOmr, "OMR"),
      outstanding: formatAmount(outstanding, "OMR"),
      status: RE_RENT_PAYMENT_STATUS_LABELS[schedule.paymentStatus] ?? schedule.paymentStatus,
      paidDate: formatDateValue(schedule.paidDate),
      pdc: schedule.pdcChequeNumber ?? "—",
      pdcStatus: schedule.pdcStatus ?? "—",
    };
  });

  return {
    ...baseResult(
      "re-rent-register",
      "Rent Collection Register",
      "Rent schedule entries with payment status and PDC tracking.",
      entityName,
    ),
    metrics: [
      { label: "Entries", value: schedules.length.toString() },
      { label: "Total Due", value: formatAmount(totalDue, "OMR") },
      { label: "Total Collected", value: formatAmount(totalPaid, "OMR") },
      { label: "Overdue", value: overdueCount.toString() },
    ],
    columns: [
      { key: "entity", label: "Entity" },
      { key: "property", label: "Property" },
      { key: "unit", label: "Unit" },
      { key: "tenant", label: "Tenant" },
      { key: "period", label: "Period" },
      { key: "dueDate", label: "Due Date" },
      { key: "amount", label: "Amount", align: "right" },
      { key: "paid", label: "Paid", align: "right" },
      { key: "outstanding", label: "Outstanding", align: "right" },
      { key: "status", label: "Status" },
      { key: "paidDate", label: "Paid Date" },
      { key: "pdc", label: "PDC #" },
      { key: "pdcStatus", label: "PDC Status" },
    ],
    rows,
    footnotes: [
      "Default period is year-to-date when no date range is selected.",
    ],
  };
}

export async function buildReLeasesReport(
  ctx: UserContext,
  params: ReportParams,
): Promise<ReportResult> {
  const entityName = await resolveEntityName(params.entityId);

  const leases = await db.reLease.findMany({
    where: {
      status: { in: ["ACTIVE", "PENDING"] },
      unit: {
        property: entityWhere(params.entityId, rePropertyEntityFilter(ctx)),
      },
    },
    include: {
      tenant: { select: { fullName: true, phonePrimary: true } },
      unit: {
        select: {
          unitNumber: true,
          property: {
            select: {
              name: true,
              entity: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: [{ leaseEndDate: "asc" }, { leaseStartDate: "asc" }],
  });

  const rows = leases.map((lease) => ({
    entity: lease.unit.property.entity.name,
    property: lease.unit.property.name,
    unit: lease.unit.unitNumber,
    tenant: lease.tenant.fullName,
    phone: lease.tenant.phonePrimary ?? "—",
    startDate: formatDateValue(lease.leaseStartDate),
    endDate: formatDateValue(lease.leaseEndDate),
    rent: formatAmount(toNumber(lease.rentAmountOmr), "OMR"),
    frequency: RE_PAYMENT_FREQUENCY_LABELS[lease.paymentFrequency] ?? lease.paymentFrequency,
    paymentMethod: RE_PAYMENT_METHOD_LABELS[lease.paymentMethod] ?? lease.paymentMethod,
    deposit: formatAmount(toNumber(lease.securityDepositOmr), "OMR"),
    depositPaid: lease.securityDepositPaid ? "Yes" : "No",
    municipalityExpiry: formatDateValue(lease.municipalityExpiryDate),
    status: RE_LEASE_STATUS_LABELS[lease.status] ?? lease.status,
  }));

  return {
    ...baseResult(
      "re-leases",
      "Active Lease Register",
      "Active and pending leases with rent terms and expiry dates.",
      entityName,
    ),
    metrics: [{ label: "Leases", value: leases.length.toString() }],
    columns: [
      { key: "entity", label: "Entity" },
      { key: "property", label: "Property" },
      { key: "unit", label: "Unit" },
      { key: "tenant", label: "Tenant" },
      { key: "phone", label: "Phone" },
      { key: "startDate", label: "Start" },
      { key: "endDate", label: "End" },
      { key: "rent", label: "Rent", align: "right" },
      { key: "frequency", label: "Frequency" },
      { key: "paymentMethod", label: "Payment" },
      { key: "deposit", label: "Deposit", align: "right" },
      { key: "depositPaid", label: "Deposit Paid" },
      { key: "municipalityExpiry", label: "Municipality Expiry" },
      { key: "status", label: "Status" },
    ],
    rows,
    footnotes: [],
  };
}

export async function buildReExpensesReport(
  ctx: UserContext,
  params: ReportParams,
): Promise<ReportResult> {
  const entityName = await resolveEntityName(params.entityId);
  const { from, to } = parseDateRange(params);
  const defaultFrom = from ?? new Date(new Date().getFullYear(), 0, 1);

  const expenses = await db.rePropertyExpense.findMany({
    where: {
      property: entityWhere(params.entityId, rePropertyEntityFilter(ctx)),
      expenseDate: {
        gte: defaultFrom,
        ...(to ? { lte: to } : {}),
      },
    },
    include: {
      property: {
        select: {
          name: true,
          entity: { select: { name: true } },
        },
      },
      unit: { select: { unitNumber: true } },
    },
    orderBy: [{ expenseDate: "desc" }, { category: "asc" }],
  });

  const totalAmount = expenses.reduce((sum, expense) => sum + (toNumber(expense.amountOmr) ?? 0), 0);

  const rows = expenses.map((expense) => ({
    entity: expense.property.entity.name,
    property: expense.property.name,
    unit: expense.unit?.unitNumber ?? "—",
    date: formatDateValue(expense.expenseDate),
    category: RE_PROPERTY_EXPENSE_CATEGORY_LABELS[expense.category] ?? expense.category,
    description: expense.description,
    vendor: expense.vendorName ?? "—",
    amount: formatAmount(toNumber(expense.amountOmr), "OMR"),
    status: RE_EXPENSE_PAYMENT_STATUS_LABELS[expense.paymentStatus] ?? expense.paymentStatus,
    paymentDate: formatDateValue(expense.paymentDate),
  }));

  return {
    ...baseResult(
      "re-expenses",
      "Property Expense Summary",
      "Operating expenses by property and category for the selected period.",
      entityName,
    ),
    metrics: [
      { label: "Expenses", value: expenses.length.toString() },
      { label: "Total Amount", value: formatAmount(totalAmount, "OMR") },
    ],
    columns: [
      { key: "entity", label: "Entity" },
      { key: "property", label: "Property" },
      { key: "unit", label: "Unit" },
      { key: "date", label: "Date" },
      { key: "category", label: "Category" },
      { key: "description", label: "Description" },
      { key: "vendor", label: "Vendor" },
      { key: "amount", label: "Amount", align: "right" },
      { key: "status", label: "Status" },
      { key: "paymentDate", label: "Paid Date" },
    ],
    rows,
    footnotes: [
      "Default period is year-to-date when no date range is selected.",
    ],
  };
}

export async function buildReValuationHistoryReport(
  ctx: UserContext,
  params: ReportParams,
): Promise<ReportResult> {
  const entityName = await resolveEntityName(params.entityId);
  const { from, to } = parseDateRange(params);
  const defaultFrom = from ?? new Date(new Date().setFullYear(new Date().getFullYear() - 2));

  const valuations = await db.rePropertyValuation.findMany({
    where: {
      property: entityWhere(params.entityId, rePropertyEntityFilter(ctx)),
      valuationDate: {
        gte: defaultFrom,
        ...(to ? { lte: to } : {}),
      },
    },
    include: {
      property: {
        select: {
          name: true,
          entity: { select: { name: true } },
        },
      },
    },
    orderBy: [{ valuationDate: "desc" }, { property: { name: "asc" } }],
  });

  const rows = valuations.map((valuation) => ({
    entity: valuation.property.entity.name,
    property: valuation.property.name,
    valuationDate: formatDateValue(valuation.valuationDate),
    value: formatAmount(toNumber(valuation.valuationOmr), "OMR"),
    method: valuation.method
      ? (RE_VALUATION_METHOD_LABELS[valuation.method] ?? valuation.method)
      : "—",
    appraiser: valuation.appraiserName ?? "—",
    company: valuation.appraiserCompany ?? "—",
    notes: valuation.notes ?? "—",
  }));

  return {
    ...baseResult(
      "re-valuation-history",
      "Property Valuation History",
      "Historical property valuations over time.",
      entityName,
    ),
    metrics: [{ label: "Valuations", value: valuations.length.toString() }],
    columns: [
      { key: "entity", label: "Entity" },
      { key: "property", label: "Property" },
      { key: "valuationDate", label: "Valuation Date" },
      { key: "value", label: "Value", align: "right" },
      { key: "method", label: "Method" },
      { key: "appraiser", label: "Appraiser" },
      { key: "company", label: "Company" },
      { key: "notes", label: "Notes" },
    ],
    rows,
    footnotes: [
      "Default period is last 2 years when no date range is selected.",
    ],
  };
}
