import type { RePropertyStatus } from "@/lib/generated/prisma/client";
import { db } from "@/lib/db";
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

export async function getPropertyMetrics(propertyId: string): Promise<PropertyMetrics> {
  const [property, units, activeLeases, maintenanceYtd, expensesYtd, rentPaidYtd, overdue] =
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
      db.reMaintenanceRequest.aggregate({
        where: {
          propertyId,
          completedDate: { gte: ytdStart() },
        },
        _sum: { actualCostOmr: true },
      }),
      db.rePropertyExpense.aggregate({
        where: {
          propertyId,
          expenseDate: { gte: ytdStart() },
          category: { not: "MORTGAGE" },
        },
        _sum: { amountOmr: true },
      }),
      db.reRentSchedule.aggregate({
        where: {
          unit: { propertyId },
          paymentStatus: "PAID",
          paidDate: { gte: ytdStart() },
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
  const totalMaintenanceCostYtdOmr = toNumber(maintenanceYtd._sum.actualCostOmr);
  const totalExpensesYtdOmr = toNumber(expensesYtd._sum.amountOmr);
  const rentCollectedYtdOmr = toNumber(rentPaidYtd._sum.paidAmountOmr);
  const netOperatingIncomeOmr = rentCollectedYtdOmr - totalExpensesYtdOmr - totalMaintenanceCostYtdOmr;
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
    db.reMaintenanceRequest.aggregate({
      where: { unitId, completedDate: { gte: ytdStart() } },
      _sum: { actualCostOmr: true },
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
    maintenanceCostYtdOmr: toNumber(maintenanceYtd._sum.actualCostOmr),
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
