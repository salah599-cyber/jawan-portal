export type ModuleName =
  | "DASHBOARD"
  | "ASSETS"
  | "LANDS"
  | "CARS"
  | "COMPANIES"
  | "DOCUMENTS"
  | "EXPENSES"
  | "REPORTS"
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
