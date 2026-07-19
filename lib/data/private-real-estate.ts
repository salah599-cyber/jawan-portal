import { db } from "@/lib/db";
import { ensureRealEstateSchema } from "@/lib/db/ensure-real-estate-schema";
import { ensureDefaultEntity } from "@/lib/data/entities";
import { listRePortfolioEntities } from "@/lib/data/real-estate";
import { linkableMortgageLoanFilter, rePropertyEntityFilter } from "@/lib/permissions/scoped-queries";
import { isSuperAdmin } from "@/lib/permissions/access";
import type { UserContext } from "@/lib/permissions/types";
import type { RePropertyStatus } from "@/lib/generated/prisma/client";
import { toNumber } from "@/lib/real-estate/helpers";
import { fileHref } from "@/lib/files/href";
import {
  LINKABLE_MORTGAGE_LIABILITY_TYPES,
  PRIVATE_RUNNING_COST_CATEGORIES,
} from "@/lib/real-estate/private-constants";

export type PrivatePropertyFilters = {
  entityId?: string;
  governorate?: string;
  status?: RePropertyStatus;
  search?: string;
};

export type PrivatePropertyListRow = {
  id: string;
  name: string;
  status: RePropertyStatus;
  governorate: string | null;
  wilayat: string | null;
  area: string | null;
  currentValuationOmr: number | null;
  monthlyRunningCostOmr: number;
  staffCount: number;
  entityName: string;
  primaryPhotoHref?: string;
  ownerDiscrepancy: boolean;
};

export type PrivatePortfolioSummary = {
  totalProperties: number;
  totalValuationOmr: number;
  totalMonthlyRunningCostOmr: number;
  totalStaff: number;
};

const privatePropertyInclude = {
  entity: { select: { id: true, name: true } },
  privateDetail: true,
  privateRunningCosts: { orderBy: { category: "asc" as const } },
  privateStaff: { orderBy: { fullName: "asc" as const } },
  documents: { orderBy: { createdAt: "desc" as const } },
  valuations: { orderBy: { valuationDate: "desc" as const } },
  liability: {
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      outstandingBalance: true,
      amount: true,
      currency: true,
      lender: true,
      maturityDate: true,
    },
  },
  insurancePolicies: {
    orderBy: { expiryDate: "asc" as const },
    select: {
      id: true,
      policyNumber: true,
      insurer: true,
      expiryDate: true,
      status: true,
    },
  },
  beneficiaryDesignations: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      familyMember: { select: { id: true, fullName: true, preferredName: true } },
    },
  },
  successionDistributionInstructions: {
    include: {
      beneficiaryMember: { select: { id: true, fullName: true, preferredName: true } },
      successionPlan: { select: { id: true, title: true, status: true } },
    },
  },
} as const;

function buildPrivateWhere(ctx: UserContext, filters?: PrivatePropertyFilters) {
  const search = filters?.search?.trim();
  return {
    ...rePropertyEntityFilter(ctx),
    portfolioTrack: "PRIVATE" as const,
    ...(filters?.entityId ? { entityId: filters.entityId } : {}),
    ...(filters?.governorate ? { governorate: filters.governorate } : {}),
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

export function estimateMonthlyRunningCost(cost: {
  monthlyCostOmr: { toString(): string } | null;
  annualCostOmr: { toString(): string } | null;
}): number {
  const monthly = toNumber(cost.monthlyCostOmr);
  if (monthly != null && monthly > 0) return monthly;
  const annual = toNumber(cost.annualCostOmr);
  if (annual != null && annual > 0) return annual / 12;
  return 0;
}

function hasOwnerDiscrepancy(detail: {
  registeredOwner: string | null;
  beneficialOwner: string | null;
} | null): boolean {
  if (!detail?.registeredOwner || !detail.beneficialOwner) return false;
  return (
    detail.registeredOwner.trim().toLowerCase() !== detail.beneficialOwner.trim().toLowerCase()
  );
}

async function ensureReady() {
  await ensureRealEstateSchema();
  await ensureDefaultEntity();
}

export async function listPrivatePortfolioEntities(ctx: UserContext) {
  return listRePortfolioEntities(ctx);
}

export async function listPrivateProperties(
  ctx: UserContext,
  filters?: PrivatePropertyFilters,
): Promise<PrivatePropertyListRow[]> {
  await ensureReady();

  const properties = await db.reProperty.findMany({
    where: buildPrivateWhere(ctx, filters),
    include: {
      entity: { select: { name: true } },
      privateDetail: true,
      privateRunningCosts: true,
      privateStaff: { select: { id: true } },
      documents: {
        where: { documentType: "PHOTO", unitId: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true },
      },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  return properties.map((property) => ({
    id: property.id,
    name: property.name,
    status: property.status,
    governorate: property.governorate,
    wilayat: property.wilayat,
    area: property.area,
    currentValuationOmr: toNumber(property.currentValuationOmr),
    monthlyRunningCostOmr: property.privateRunningCosts.reduce(
      (sum, cost) => sum + estimateMonthlyRunningCost(cost),
      0,
    ),
    staffCount: property.privateStaff.length,
    entityName: property.entity.name,
    primaryPhotoHref:
      isSuperAdmin(ctx) && property.documents[0]
        ? fileHref("re-property", property.documents[0].id)
        : undefined,
    ownerDiscrepancy: hasOwnerDiscrepancy(property.privateDetail),
  }));
}

export async function getPrivatePortfolioSummary(
  ctx: UserContext,
  entityId?: string,
): Promise<PrivatePortfolioSummary> {
  const properties = await listPrivateProperties(ctx, entityId ? { entityId } : undefined);
  return {
    totalProperties: properties.length,
    totalValuationOmr: properties.reduce(
      (sum, property) => sum + (property.currentValuationOmr ?? 0),
      0,
    ),
    totalMonthlyRunningCostOmr: properties.reduce(
      (sum, property) => sum + property.monthlyRunningCostOmr,
      0,
    ),
    totalStaff: properties.reduce((sum, property) => sum + property.staffCount, 0),
  };
}

export async function getPrivateProperty(propertyId: string, ctx: UserContext) {
  await ensureReady();

  const property = await db.reProperty.findFirst({
    where: {
      id: propertyId,
      portfolioTrack: "PRIVATE",
      ...rePropertyEntityFilter(ctx),
    },
    include: privatePropertyInclude,
  });

  if (!property) return null;

  const monthlyRunningCostOmr = property.privateRunningCosts.reduce(
    (sum, cost) => sum + estimateMonthlyRunningCost(cost),
    0,
  );

  return {
    ...property,
    ownerDiscrepancy: hasOwnerDiscrepancy(property.privateDetail),
    monthlyRunningCostOmr,
  };
}

export type PrivatePropertyDetail = NonNullable<Awaited<ReturnType<typeof getPrivateProperty>>>;

export async function listPrivateMortgageOptions(ctx: UserContext, entityId: string) {
  await ensureReady();
  return db.liability.findMany({
    where: {
      entityId,
      type: { in: LINKABLE_MORTGAGE_LIABILITY_TYPES },
      status: "ACTIVE",
      ...linkableMortgageLoanFilter(ctx),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      lender: true,
      outstandingBalance: true,
      amount: true,
      currency: true,
    },
  });
}

export async function listPrivateFamilyMembers(ctx: UserContext) {
  await ensureReady();
  const filter = rePropertyEntityFilter(ctx);
  if ("id" in filter && filter.id === "__none__") return [];

  return db.familyMember.findMany({
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, preferredName: true },
  });
}

export { PRIVATE_RUNNING_COST_CATEGORIES };
