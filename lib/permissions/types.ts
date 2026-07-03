export type ModuleName =
  | "DASHBOARD"
  | "ASSETS"
  | "LANDS"
  | "REAL_ESTATE"
  | "CARS"
  | "COMPANIES"
  | "LOANS"
  | "CHEQUES"
  | "PROPOSALS"
  | "DOCUMENTS"
  | "EXPENSES"
  | "REPORTS"
  | "PRIVATE_EQUITY"
  | "CASH_MANAGEMENT"
  | "CALENDAR"
  | "USERS"
  | "AUDIT";

export type PermissionLevel = "FULL" | "READ" | "FILTERED" | "NONE" | "SHARED_ONLY";

export type UserRole =
  | "PRINCIPAL"
  | "SIGNATORY"
  | "FINANCE"
  | "DIRECTOR"
  | "EXTERNAL";

export interface UserContext {
  id: string;
  clerkId: string;
  email: string;
  role: UserRole;
  isSuperAdmin: boolean;
  entityIds: string[];
  documentCategories: string[];
  overrides: Partial<Record<ModuleName, PermissionLevel>>;
}
