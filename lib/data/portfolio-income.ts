import { db } from "@/lib/db";
import { canAccess } from "@/lib/permissions/access";
import {
  lpCommitmentEntityFilter,
  peCompanyEntityFilter,
  rePropertyEntityFilter,
} from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";
import { convertToOmr, entityWhere, toNumber } from "@/lib/reports/helpers";

export type IncomeSource = "PE" | "LP";
export type IncomeCategory = "Rental" | "PE" | "LP";

export type PortfolioIncomeFilters = {
  entityId?: string;
  from: Date;
  to?: Date;
};

export type RentalIncomeRow = {
  id: string;
  entityId: string;
  entityName: string;
  propertyName: string;
  propertyId: string;
  unitNumber: string;
  tenantName: string;
  paidDate: Date;
  amountOmr: number;
};

export type PeDistributionRow = {
  id: string;
  entityId: string;
  entityName: string;
  investmentName: string;
  distributionDate: Date;
  distributionType: string;
  amount: number;
  currency: string;
  amountOmr: number;
};

export type LpDistributionRow = {
  id: string;
  entityId: string;
  entityName: string;
  investmentName: string;
  distributionDate: Date;
  distributionType: string;
  amount: number;
  currency: string;
  amountOmr: number;
};

export type IncomeSummary = {
  rentalTotalOmr: number;
  peTotalOmr: number;
  lpTotalOmr: number;
  investmentIncomeTotalOmr: number;
  grandTotalOmr: number;
  incomeSubtotalOmr: number;
};

export function isIncomeDistribution(source: IncomeSource, type: string): boolean {
  if (source === "PE") {
    return type === "DIVIDEND" || type === "INTEREST";
  }
  return type === "INCOME";
}

function dateRangeWhere(from: Date, to?: Date) {
  return {
    gte: from,
    ...(to ? { lte: to } : {}),
  };
}

export async function fetchRentalIncome(
  ctx: UserContext,
  filters: PortfolioIncomeFilters,
): Promise<RentalIncomeRow[]> {
  if (!canAccess(ctx, "REAL_ESTATE")) return [];

  const schedules = await db.reRentSchedule.findMany({
    where: {
      paymentStatus: { in: ["PAID", "PARTIALLY_PAID"] },
      unit: {
        property: entityWhere(filters.entityId, rePropertyEntityFilter(ctx)),
      },
      OR: [
        {
          paidDate: dateRangeWhere(filters.from, filters.to),
        },
        {
          paidDate: null,
          paymentStatus: "PAID",
          dueDate: dateRangeWhere(filters.from, filters.to),
        },
      ],
    },
    include: {
      unit: {
        select: {
          unitNumber: true,
          property: {
            select: {
              id: true,
              name: true,
              entityId: true,
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
    orderBy: [{ paidDate: "desc" }, { dueDate: "desc" }],
  });

  return schedules.map((schedule) => ({
    id: schedule.id,
    entityId: schedule.unit.property.entityId,
    entityName: schedule.unit.property.entity.name,
    propertyName: schedule.unit.property.name,
    propertyId: schedule.unit.property.id,
    unitNumber: schedule.unit.unitNumber,
    tenantName: schedule.lease.tenant.fullName,
    paidDate: schedule.paidDate ?? schedule.dueDate,
    amountOmr: toNumber(schedule.paidAmountOmr) ?? toNumber(schedule.amountOmr) ?? 0,
  }));
}

export async function fetchPeDistributions(
  ctx: UserContext,
  filters: PortfolioIncomeFilters,
): Promise<PeDistributionRow[]> {
  if (!canAccess(ctx, "PRIVATE_EQUITY")) return [];

  const distributions = await db.peDistribution.findMany({
    where: {
      distributionDate: dateRangeWhere(filters.from, filters.to),
      company: entityWhere(filters.entityId, peCompanyEntityFilter(ctx)),
    },
    include: {
      company: {
        select: {
          name: true,
          entityId: true,
          reportingCurrency: true,
          entity: { select: { name: true } },
        },
      },
    },
    orderBy: { distributionDate: "desc" },
  });

  const rows: PeDistributionRow[] = [];
  for (const distribution of distributions) {
    const amount = toNumber(distribution.amountReporting) ?? 0;
    const currency = distribution.company.reportingCurrency;
    rows.push({
      id: distribution.id,
      entityId: distribution.company.entityId,
      entityName: distribution.company.entity.name,
      investmentName: distribution.company.name,
      distributionDate: distribution.distributionDate,
      distributionType: distribution.distributionType,
      amount,
      currency,
      amountOmr: await convertToOmr(amount, currency),
    });
  }
  return rows;
}

export async function fetchLpDistributions(
  ctx: UserContext,
  filters: PortfolioIncomeFilters,
): Promise<LpDistributionRow[]> {
  if (!canAccess(ctx, "FUND_LP")) return [];

  const distributions = await db.lpDistribution.findMany({
    where: {
      distributionDate: dateRangeWhere(filters.from, filters.to),
      commitment: entityWhere(filters.entityId, lpCommitmentEntityFilter(ctx)),
    },
    include: {
      commitment: {
        select: {
          entityId: true,
          entity: { select: { name: true } },
          fund: { select: { name: true } },
        },
      },
    },
    orderBy: { distributionDate: "desc" },
  });

  const rows: LpDistributionRow[] = [];
  for (const distribution of distributions) {
    const amount = toNumber(distribution.amount) ?? 0;
    const currency = distribution.currency;
    rows.push({
      id: distribution.id,
      entityId: distribution.commitment.entityId,
      entityName: distribution.commitment.entity.name,
      investmentName: distribution.commitment.fund.name,
      distributionDate: distribution.distributionDate,
      distributionType: distribution.distributionType,
      amount,
      currency,
      amountOmr: await convertToOmr(amount, currency),
    });
  }
  return rows;
}

export async function summarizeIncomeBySource(
  ctx: UserContext,
  filters: PortfolioIncomeFilters,
): Promise<{
  rental: RentalIncomeRow[];
  pe: PeDistributionRow[];
  lp: LpDistributionRow[];
  summary: IncomeSummary;
}> {
  const [rental, pe, lp] = await Promise.all([
    fetchRentalIncome(ctx, filters),
    fetchPeDistributions(ctx, filters),
    fetchLpDistributions(ctx, filters),
  ]);

  const rentalTotalOmr = rental.reduce((sum, row) => sum + row.amountOmr, 0);
  const peTotalOmr = pe.reduce((sum, row) => sum + row.amountOmr, 0);
  const lpTotalOmr = lp.reduce((sum, row) => sum + row.amountOmr, 0);

  const peIncomeSubtotal = pe
    .filter((row) => isIncomeDistribution("PE", row.distributionType))
    .reduce((sum, row) => sum + row.amountOmr, 0);
  const lpIncomeSubtotal = lp
    .filter((row) => isIncomeDistribution("LP", row.distributionType))
    .reduce((sum, row) => sum + row.amountOmr, 0);

  const investmentIncomeTotalOmr = peTotalOmr + lpTotalOmr;
  const grandTotalOmr = rentalTotalOmr + investmentIncomeTotalOmr;
  const incomeSubtotalOmr = rentalTotalOmr + peIncomeSubtotal + lpIncomeSubtotal;

  return {
    rental,
    pe,
    lp,
    summary: {
      rentalTotalOmr,
      peTotalOmr,
      lpTotalOmr,
      investmentIncomeTotalOmr,
      grandTotalOmr,
      incomeSubtotalOmr,
    },
  };
}
