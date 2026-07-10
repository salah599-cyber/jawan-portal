import { db } from "@/lib/db";
import { ensureRealEstateSchema } from "@/lib/db/ensure-real-estate-schema";
import { ensureDefaultEntity, listEntities } from "@/lib/data/entities";
import { rePropertyEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";
import type {
  RePortfolioTrack,
  RePropertyStatus,
  RePropertyType,
  ReRentPaymentStatus,
} from "@/lib/generated/prisma/client";
import { getPropertyAlerts } from "@/lib/real-estate/alerts";
import { getPropertyMetrics, getUnitMetrics } from "@/lib/real-estate/metrics";
import { refreshRentScheduleStatuses } from "@/lib/real-estate/rent-schedule";
import { toNumber } from "@/lib/real-estate/helpers";
import { fileHref } from "@/lib/files/href";

const METRICS_BATCH_SIZE = 10;

export type RePropertyListRow = {
  id: string;
  name: string;
  propertyType: RePropertyType;
  status: RePropertyStatus;
  governorate: string | null;
  wilayat: string | null;
  area: string | null;
  numUnits: number;
  occupiedUnits: number;
  grossMonthlyRentOmr: number;
  overdueRentOmr: number;
  grossYieldPct: number | null;
  currentValuationOmr: number | null;
  primaryPhotoHref?: string;
  entityName: string;
};

export type RePortfolioSummary = {
  totalProperties: number;
  totalPortfolioValueOmr: number;
  overallOccupancyPct: number;
  totalGrossMonthlyRentOmr: number;
  totalOverdueRentOmr: number;
  totalExpensesYtdOmr: number;
  totalMaintenanceYtdOmr: number;
  netOperatingIncomeYtdOmr: number;
  netYieldPct: number | null;
};

export type RePropertyFilters = {
  governorate?: string;
  propertyType?: RePropertyType;
  status?: RePropertyStatus;
  search?: string;
  entityId?: string;
  portfolioTrack?: RePortfolioTrack;
};

function defaultPortfolioTrack(filters?: RePropertyFilters): RePortfolioTrack {
  return filters?.portfolioTrack ?? "INVESTMENT";
}

export type ReRentDashboardFilters = RePropertyFilters & {
  paymentStatus?: ReRentPaymentStatus | ReRentPaymentStatus[];
};

export type ReRentDashboardSummary = {
  propertyCount: number;
  totalUnits: number;
  occupiedUnits: number;
  grossMonthlyRentOmr: number;
  overdueRentOmr: number;
  overdueCount: number;
  dueThisMonthOmr: number;
  dueThisMonthCount: number;
  collectedYtdOmr: number;
  pendingPdcCount: number;
};

export type ReRentScheduleRow = {
  id: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitNumber: string;
  tenantName: string;
  dueDate: Date;
  amountOmr: number;
  paidAmountOmr: number;
  outstandingOmr: number;
  paymentStatus: ReRentPaymentStatus;
  periodLabel: string;
  pdcChequeNumber: string | null;
  pdcBank: string | null;
  pdcStatus: string | null;
};

export type ReRentDashboard = {
  summary: ReRentDashboardSummary;
  rows: ReRentScheduleRow[];
};

export const propertyInclude = {
  entity: true,
  asset: {
    include: {
      exit: { include: { documents: { orderBy: { createdAt: "desc" as const } } } },
    },
  },
  landParcel: true,
  units: {
    orderBy: { unitNumber: "asc" as const },
    include: {
      tenants: { orderBy: { createdAt: "desc" as const } },
      leases: {
        orderBy: { leaseStartDate: "desc" as const },
        include: {
          tenant: true,
          rentSchedules: { orderBy: { dueDate: "asc" as const } },
          documents: { orderBy: { createdAt: "desc" as const } },
        },
      },
      rentSchedules: { orderBy: { dueDate: "desc" as const } },
      maintenance: { orderBy: { reportedDate: "desc" as const } },
      utilityReadings: { orderBy: { readingDate: "desc" as const } },
      expenses: { orderBy: { expenseDate: "desc" as const } },
      documents: { orderBy: { createdAt: "desc" as const } },
    },
  },
  maintenance: {
    orderBy: { reportedDate: "desc" as const },
    include: { unit: { select: { id: true, unitNumber: true } } },
  },
  valuations: { orderBy: { valuationDate: "desc" as const } },
  expenses: {
    orderBy: { expenseDate: "desc" as const },
    include: { unit: { select: { id: true, unitNumber: true } } },
  },
  documents: { orderBy: { createdAt: "desc" as const } },
} as const;

const unitDetailInclude = {
  property: {
    include: {
      entity: { select: { id: true, name: true } },
    },
  },
  tenants: { orderBy: { createdAt: "desc" as const } },
  leases: {
    orderBy: { leaseStartDate: "desc" as const },
    include: {
      tenant: true,
      rentSchedules: { orderBy: { dueDate: "desc" as const } },
      documents: { orderBy: { createdAt: "desc" as const } },
    },
  },
  rentSchedules: {
    orderBy: { dueDate: "desc" as const },
    include: {
      lease: { include: { tenant: { select: { fullName: true } } } },
    },
  },
  maintenance: { orderBy: { reportedDate: "desc" as const } },
  utilityReadings: { orderBy: { readingDate: "desc" as const } },
  expenses: { orderBy: { expenseDate: "desc" as const } },
  documents: { orderBy: { createdAt: "desc" as const } },
} as const;

export type RePropertyDetail = NonNullable<Awaited<ReturnType<typeof getProperty>>>;
export type ReUnitDetail = NonNullable<Awaited<ReturnType<typeof getUnitDetail>>>;

function getFilteredEntityIds(ctx: UserContext): string[] | null {
  const filter = rePropertyEntityFilter(ctx);
  if ("entityId" in filter && filter.entityId && "in" in filter.entityId) {
    return filter.entityId.in;
  }
  return null;
}

function buildPropertyWhere(ctx: UserContext, filters?: RePropertyFilters) {
  const search = filters?.search?.trim();
  return {
    ...rePropertyEntityFilter(ctx),
    portfolioTrack: defaultPortfolioTrack(filters),
    ...(filters?.entityId ? { entityId: filters.entityId } : {}),
    ...(filters?.governorate ? { governorate: filters.governorate } : {}),
    ...(filters?.propertyType ? { propertyType: filters.propertyType } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { area: { contains: search, mode: "insensitive" as const } },
            { governorate: { contains: search, mode: "insensitive" as const } },
            { wilayat: { contains: search, mode: "insensitive" as const } },
            { streetAddress: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

async function ensureRealEstateDataLayerReady() {
  await ensureRealEstateSchema();
  await ensureDefaultEntity();
}

async function getPropertyMetricsBatch(propertyIds: string[]) {
  const results = new Map<string, Awaited<ReturnType<typeof getPropertyMetrics>>>();
  for (let i = 0; i < propertyIds.length; i += METRICS_BATCH_SIZE) {
    const batch = propertyIds.slice(i, i + METRICS_BATCH_SIZE);
    const batchMetrics = await Promise.all(batch.map((id) => getPropertyMetrics(id)));
    batch.forEach((id, index) => {
      results.set(id, batchMetrics[index]);
    });
  }
  return results;
}

function ytdStart() {
  const now = new Date();
  return new Date(now.getFullYear(), 0, 1);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

const emptyPortfolioSummary = (): RePortfolioSummary => ({
  totalProperties: 0,
  totalPortfolioValueOmr: 0,
  overallOccupancyPct: 0,
  totalGrossMonthlyRentOmr: 0,
  totalOverdueRentOmr: 0,
  totalExpensesYtdOmr: 0,
  totalMaintenanceYtdOmr: 0,
  netOperatingIncomeYtdOmr: 0,
  netYieldPct: null,
});

const emptyRentDashboard = (): ReRentDashboard => ({
  summary: {
    propertyCount: 0,
    totalUnits: 0,
    occupiedUnits: 0,
    grossMonthlyRentOmr: 0,
    overdueRentOmr: 0,
    overdueCount: 0,
    dueThisMonthOmr: 0,
    dueThisMonthCount: 0,
    collectedYtdOmr: 0,
    pendingPdcCount: 0,
  },
  rows: [],
});

export async function listRePortfolioEntities(ctx: UserContext) {
  await ensureRealEstateDataLayerReady();
  const filteredIds = getFilteredEntityIds(ctx);

  if (filteredIds) {
    return db.entity.findMany({
      where: { id: { in: filteredIds } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  }

  return listEntities().then((entities) =>
    entities.map((entity) => ({ id: entity.id, name: entity.name })),
  );
}

export async function listProperties(
  ctx: UserContext,
  filters?: RePropertyFilters,
): Promise<RePropertyListRow[]> {
  await ensureRealEstateDataLayerReady();
  await refreshRentScheduleStatuses();

  const properties = await db.reProperty.findMany({
    where: buildPropertyWhere(ctx, filters),
    include: {
      entity: { select: { name: true } },
      documents: {
        where: { documentType: "PHOTO", unitId: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true },
      },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  if (properties.length === 0) return [];

  const metricsById = await getPropertyMetricsBatch(properties.map((property) => property.id));

  return properties.map((property) => {
    const metrics = metricsById.get(property.id);
    return {
      id: property.id,
      name: property.name,
      propertyType: property.propertyType,
      status: property.status,
      governorate: property.governorate,
      wilayat: property.wilayat,
      area: property.area,
      numUnits: metrics?.totalUnits ?? property.numUnits,
      occupiedUnits: metrics?.occupiedUnits ?? 0,
      grossMonthlyRentOmr: metrics?.grossMonthlyRentOmr ?? 0,
      overdueRentOmr: metrics?.overdueRentOmr ?? 0,
      grossYieldPct: metrics?.grossYieldPct ?? null,
      currentValuationOmr: toNumber(property.currentValuationOmr) || null,
      primaryPhotoHref: property.documents[0]
        ? fileHref("re-property", property.documents[0].id)
        : undefined,
      entityName: property.entity.name,
    };
  });
}

export async function getPortfolioSummary(
  ctx: UserContext,
  entityId?: string,
): Promise<RePortfolioSummary> {
  await ensureRealEstateDataLayerReady();
  await refreshRentScheduleStatuses();

  const properties = await listProperties(ctx, entityId ? { entityId } : undefined);
  if (properties.length === 0) return emptyPortfolioSummary();

  const totalUnits = properties.reduce((sum, property) => sum + property.numUnits, 0);
  const occupiedUnits = properties.reduce((sum, property) => sum + property.occupiedUnits, 0);
  const totalPortfolioValueOmr = properties.reduce(
    (sum, property) => sum + (property.currentValuationOmr ?? 0),
    0,
  );
  const totalGrossMonthlyRentOmr = properties.reduce(
    (sum, property) => sum + property.grossMonthlyRentOmr,
    0,
  );
  const totalOverdueRentOmr = properties.reduce(
    (sum, property) => sum + property.overdueRentOmr,
    0,
  );

  const metricsById = await getPropertyMetricsBatch(properties.map((property) => property.id));
  const totalNetOperatingIncome = [...metricsById.values()].reduce(
    (sum, metrics) => sum + metrics.netOperatingIncomeOmr,
    0,
  );
  const totalExpensesYtdOmr = [...metricsById.values()].reduce(
    (sum, metrics) => sum + metrics.totalExpensesYtdOmr,
    0,
  );
  const totalMaintenanceYtdOmr = [...metricsById.values()].reduce(
    (sum, metrics) => sum + metrics.totalMaintenanceCostYtdOmr,
    0,
  );

  return {
    totalProperties: properties.length,
    totalPortfolioValueOmr,
    overallOccupancyPct: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
    totalGrossMonthlyRentOmr,
    totalOverdueRentOmr,
    totalExpensesYtdOmr,
    totalMaintenanceYtdOmr,
    netOperatingIncomeYtdOmr: totalNetOperatingIncome,
    netYieldPct:
      totalPortfolioValueOmr > 0
        ? (totalNetOperatingIncome / totalPortfolioValueOmr) * 100
        : null,
  };
}

export async function getProperty(propertyId: string, ctx: UserContext) {
  await ensureRealEstateDataLayerReady();
  await refreshRentScheduleStatuses();

  const property = await db.reProperty.findFirst({
    where: { id: propertyId, ...rePropertyEntityFilter(ctx) },
    include: propertyInclude,
  });

  if (!property) return null;

  const [metrics, alerts] = await Promise.all([
    getPropertyMetrics(propertyId),
    getPropertyAlerts(propertyId),
  ]);

  return { ...property, metrics, alerts };
}

export async function getUnitDetail(unitId: string, ctx: UserContext) {
  await ensureRealEstateDataLayerReady();
  await refreshRentScheduleStatuses();

  const unit = await db.reUnit.findFirst({
    where: {
      id: unitId,
      property: rePropertyEntityFilter(ctx),
    },
    include: unitDetailInclude,
  });

  if (!unit) return null;

  const metrics = await getUnitMetrics(unitId);
  const activeTenant = unit.tenants[0] ?? unit.leases.find((lease) => lease.status === "ACTIVE")?.tenant ?? null;

  return {
    ...unit,
    tenant: activeTenant,
    metrics,
  };
}

export async function getRentDashboard(
  ctx: UserContext,
  filters?: ReRentDashboardFilters,
): Promise<ReRentDashboard> {
  await ensureRealEstateDataLayerReady();
  await refreshRentScheduleStatuses();

  const properties = await db.reProperty.findMany({
    where: buildPropertyWhere(ctx, filters),
    select: { id: true, name: true, numUnits: true },
    orderBy: { name: "asc" },
  });

  if (properties.length === 0) return emptyRentDashboard();

  const propertyIds = properties.map((property) => property.id);
  const propertyNameById = new Map(properties.map((property) => [property.id, property.name]));
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const ytd = ytdStart();

  const paymentStatuses = filters?.paymentStatus
    ? Array.isArray(filters.paymentStatus)
      ? filters.paymentStatus
      : [filters.paymentStatus]
    : undefined;

  const scheduleWhere = {
    unit: { propertyId: { in: propertyIds } },
    ...(paymentStatuses ? { paymentStatus: { in: paymentStatuses } } : {}),
  };

  const [scheduleRows, collectedYtd, pendingPdcCount, metricsById] = await Promise.all([
    db.reRentSchedule.findMany({
      where: scheduleWhere,
      include: {
        unit: {
          select: {
            id: true,
            unitNumber: true,
            propertyId: true,
          },
        },
        lease: {
          include: {
            tenant: { select: { fullName: true } },
          },
        },
      },
      orderBy: [{ paymentStatus: "asc" }, { dueDate: "asc" }],
      take: 200,
    }),
    db.reRentSchedule.aggregate({
      where: {
        unit: { propertyId: { in: propertyIds } },
        paymentStatus: "PAID",
        paidDate: { gte: ytd },
      },
      _sum: { paidAmountOmr: true },
    }),
    db.reRentSchedule.count({
      where: {
        unit: { propertyId: { in: propertyIds } },
        pdcStatus: "PENDING",
      },
    }),
    getPropertyMetricsBatch(propertyIds),
  ]);

  let totalUnits = 0;
  let occupiedUnits = 0;
  let grossMonthlyRentOmr = 0;
  let overdueRentOmr = 0;
  let overdueCount = 0;

  for (const metrics of metricsById.values()) {
    totalUnits += metrics.totalUnits;
    occupiedUnits += metrics.occupiedUnits;
    grossMonthlyRentOmr += metrics.grossMonthlyRentOmr;
    overdueRentOmr += metrics.overdueRentOmr;
    overdueCount += metrics.overdueRentCount;
  }

  const dueThisMonthRows = scheduleRows.filter(
    (row) => row.dueDate >= monthStart && row.dueDate <= monthEnd,
  );
  const dueThisMonthOmr = dueThisMonthRows.reduce(
    (sum, row) => sum + toNumber(row.amountOmr) - toNumber(row.paidAmountOmr),
    0,
  );

  return {
    summary: {
      propertyCount: properties.length,
      totalUnits,
      occupiedUnits,
      grossMonthlyRentOmr,
      overdueRentOmr,
      overdueCount,
      dueThisMonthOmr,
      dueThisMonthCount: dueThisMonthRows.length,
      collectedYtdOmr: toNumber(collectedYtd._sum.paidAmountOmr),
      pendingPdcCount,
    },
    rows: scheduleRows.map((row) => {
      const amountOmr = toNumber(row.amountOmr);
      const paidAmountOmr = toNumber(row.paidAmountOmr);
      return {
        id: row.id,
        propertyId: row.unit.propertyId,
        propertyName: propertyNameById.get(row.unit.propertyId) ?? "",
        unitId: row.unit.id,
        unitNumber: row.unit.unitNumber,
        tenantName: row.lease.tenant.fullName,
        dueDate: row.dueDate,
        amountOmr,
        paidAmountOmr,
        outstandingOmr: amountOmr - paidAmountOmr,
        paymentStatus: row.paymentStatus,
        periodLabel: row.periodLabel,
        pdcChequeNumber: row.pdcChequeNumber,
        pdcBank: row.pdcBank,
        pdcStatus: row.pdcStatus,
      };
    }),
  };
}