import type { LiabilityType, RePrivateCostCategory } from "@/lib/generated/prisma/client";

export const PRIVATE_RE_PATH = "/real-estate/private";

/** Liability types that can be linked as a private property mortgage. */
export const LINKABLE_MORTGAGE_LIABILITY_TYPES: LiabilityType[] = ["MORTGAGE", "LOAN"];

export const PRIVATE_RUNNING_COST_CATEGORIES: RePrivateCostCategory[] = [
  "ELECTRICITY",
  "WATER",
  "MUNICIPALITY_FEES",
  "INTERNET_TELECOM",
  "SECURITY",
  "HOUSEKEEPING",
  "GARDENING",
  "POOL_MAINTENANCE",
  "PEST_CONTROL",
  "AC_MAINTENANCE",
  "GENERAL_MAINTENANCE_RESERVE",
];
