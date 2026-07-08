import type { RePropertyStatus } from "@/lib/generated/prisma/client";
import { db } from "@/lib/db";
import {
  MAINTENANCE_EXPENSE_NOTE_PREFIX,
} from "@/lib/real-estate/maintenance-expense-sync";
import { toNumber, sumDecimals } from "@/lib/real-estate/helpers";

export type PropertyMetrics = {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRatePct: number;
  grossMonthlyRentOmr: number;
  grossAnnualRentOmr: number;
  totalMaintenanceCostYtdOmr: number;
  totalExpensesYtdOmr: number;
  netOperatingIncomeOmr: number;
  grossYieldPct: number | null;
  netYieldPct: number | null;
  overdueRentOmr: number;
  overdueRentCount: number;
  rentCollectedYtdOmr: number;
};

function ytdStart() {
  const now = new Date();
  return new Date(now.getFullYear(), 0, 1);
}

function maintenanceCostFromRequest(request: {
  actualCostOmr: { toString(): string } | null;
  quotedCostOmr: { toString(): string } | null;
}) {
  return toNumber(request.actualCostOmr ?? request.quotedCostOmr);
}

export async function getPropertyMetrics(propertyId: string): Promise<PropertyMetrics> {
  const ytd = ytdStart();
  const [property, units, activeLeases, completedMaintenanceYtd, expensesYtd, rentPaidYtd, overdue] =
    await Promise.all([
      db.reProperty.findUnique({
        where: { id: propertyId },
        select: { currentValuationOmr: true, numUnits: true },
      }),
      db.reUnit.findMany({
        where: { propertyId },
        select: { id: true, occupancyStatus: true },
      }),
      db.reLease.findMany({
        where: { unit: { propertyId }, status: "ACTIVE" },
        select: { rentAmountOmr: true },
      }),
      db.reMaintenanceRequest.findMany({
        where: {
          propertyId,
          status: "COMPLETED",
          completedDate: { gte: ytd },
        },
        select: {
          id: true,
          actualCostOmr: true,
          quotedCostOmr: true,
        },
      }),
      db.rePropertyExpense.findMany({
        where: {
          propertyId,
          expenseDate: { gte: ytd },
          category: { not: "MORTGAGE" },
        },
        select: {
          category: true,
          amountOmr: true,
          notes: true,
        },
      }),
      db.reRentSchedule.aggregate({
        where: {
          unit: { propertyId },
          paymentStatus: "PAID",
          paidDate: { gte: ytd },
        },
        _sum: { paidAmountOmr: true },
      }),
      db.reRentSchedule.findMany({
        where: {
          unit: { propertyId },
          paymentStatus: { in: ["OVERDUE", "PARTIALLY_PAID"] },
        },
        select: { amountOmr: true, paidAmountOmr: true },
      }),
    ]);

  const totalUnits = units.length || property?.numUnits || 0;
  const occupiedUnits = units.filter((u) => u.occupancyStatus === "RENTED").length;
  const vacantUnits = units.filter((u) => u.occupancyStatus === "VACANT").length;
  const grossMonthlyRentOmr = sumDecimals(activeLeases.map((l) => l.rentAmountOmr));
  const grossAnnualRentOmr = grossMonthlyRentOmr * 12;
  const rentCollectedYtdOmr = toNumber(rentPaidYtd._sum.paidAmountOmr);

  const syncedMaintenanceIds = new Set(
    expensesYtd
      .map((expense) => expense.notes)
      .filter((note): note is string => !!note && note.startsWith(MAINTENANCE_EXPENSE_NOTE_PREFIX))
      .map((note) => note.slice(MAINTENANCE_EXPENSE_NOTE_PREFIX.length)),
  );

  let totalMaintenanceCostYtdOmr = 0;
  let totalExpensesYtdOmr = 0;

  for (const expense of expensesYtd) {
    const amount = toNumber(expense.amountOmr);
    if (expense.category === "MAINTENANCE") {
      totalMaintenanceCostYtdOmr += amount;
      continue;
    }
    totalExpensesYtdOmr += amount;
  }

  for (const request of completedMaintenanceYtd) {
    if (syncedMaintenanceIds.has(request.id)) continue;
    totalMaintenanceCostYtdOmr += maintenanceCostFromRequest(request);
  }

  const netOperatingIncomeOmr =
    rentCollectedYtdOmr - totalExpensesYtdOmr - totalMaintenanceCostYtdOmr;
  const valuation = toNumber(property?.currentValuationOmr);
  const grossYieldPct = valuation > 0 ? (grossAnnualRentOmr / valuation) * 100 : null;
  const netYieldPct = valuation > 0 ? (netOperatingIncomeOmr / valuation) * 100 : null;
  const overdueRentOmr = sumDecimals(
    overdue.map((row) => toNumber(row.amountOmr) - toNumber(row.paidAmountOmr)),
  );

  return {
    totalUnits,
    occupiedUnits,
    vacantUnits,
    occupancyRatePct: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
    grossMonthlyRentOmr,
    grossAnnualRentOmr,
    totalMaintenanceCostYtdOmr,
    totalExpensesYtdOmr,
    netOperatingIncomeOmr,
    grossYieldPct,
    netYieldPct,
    overdueRentOmr,
    overdueRentCount: overdue.length,
    rentCollectedYtdOmr,
  };
}

export async function getUnitMetrics(unitId: string) {
  const now = new Date();
  const [activeLease, rentCollectedYtd, outstanding, maintenanceYtd] = await Promise.all([
    db.reLease.findFirst({
      where: { unitId, status: "ACTIVE" },
      include: { tenant: true },
      orderBy: { leaseEndDate: "desc" },
    }),
    db.reRentSchedule.aggregate({
      where: {
        unitId,
        paymentStatus: "PAID",
        paidDate: { gte: ytdStart() },
      },
      _sum: { paidAmountOmr: true },
    }),
    db.reRentSchedule.findMany({
      where: {
        unitId,
        paymentStatus: { in: ["OVERDUE", "PARTIALLY_PAID", "PENDING"] },
        dueDate: { lte: now },
      },
      select: { amountOmr: true, paidAmountOmr: true },
    }),
    db.reMaintenanceRequest.findMany({
      where: {
        unitId,
        status: "COMPLETED",
        completedDate: { gte: ytdStart() },
      },
      select: {
        actualCostOmr: true,
        quotedCostOmr: true,
      },
    }),
  ]);

  const leaseEndDate = activeLease?.leaseEndDate ?? null;
  const daysUntilLeaseExpiry = leaseEndDate
    ? Math.ceil((leaseEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    currentTenantName: activeLease?.tenant.fullName ?? null,
    leaseEndDate,
    daysUntilLeaseExpiry,
    rentCollectedYtdOmr: toNumber(rentCollectedYtd._sum.paidAmountOmr),
    outstandingRentOmr: sumDecimals(
      outstanding.map((row) => toNumber(row.amountOmr) - toNumber(row.paidAmountOmr)),
    ),
    maintenanceCostYtdOmr: sumDecimals(
      maintenanceYtd.map((request) => maintenanceCostFromRequest(request)),
    ),
    activeLease,
  };
}

export function propertyStatusToAssetStatus(status: RePropertyStatus) {
  switch (status) {
    case "SOLD":
      return "EXITED" as const;
    case "FOR_SALE":
      return "MONITOR" as const;
    case "UNDER_RENOVATION":
      return "MONITOR" as const;
    case "DRAFT":
      return "DEFERRED" as const;
    default:
      return "ACTIVE" as const;
  }
}
