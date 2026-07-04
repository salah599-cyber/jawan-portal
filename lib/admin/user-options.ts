import type { UserRole } from "@/lib/generated/prisma/client";
import type { ModuleName } from "@/lib/permissions/types";

export const MANAGEABLE_MODULES: { module: ModuleName; label: string }[] = [
  { module: "DASHBOARD", label: "Dashboard" },
  { module: "ASSETS", label: "Assets" },
  { module: "LANDS", label: "Lands" },
  { module: "REAL_ESTATE", label: "Real Estate" },
  { module: "CARS", label: "Cars" },
  { module: "COMPANIES", label: "Companies" },
  { module: "LOANS", label: "Loans" },
  { module: "CHEQUES", label: "Cheques" },
  { module: "PROPOSALS", label: "Proposals" },
  { module: "DOCUMENTS", label: "Documents" },
  { module: "INSURANCE", label: "Insurance Register" },
  { module: "EXPENSES", label: "Expenses" },
  { module: "REPORTS", label: "Reports" },
  { module: "PRIVATE_EQUITY", label: "PE / VC Portfolio" },
  { module: "FUND_LP", label: "Fund LP Investments" },
  { module: "CASH_MANAGEMENT", label: "Cash Management" },
  { module: "CALENDAR", label: "Calendar & Tasks" },
  { module: "USERS", label: "Users" },
  { module: "AUDIT", label: "Audit Log" },
  { module: "FAMILY_MEMBERS", label: "Family Members & Beneficiaries" },
  { module: "SUCCESSION", label: "Succession & Estate Planning" },
];

export const USER_ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "PRINCIPAL", label: "Principal" },
  { value: "SIGNATORY", label: "Signatory" },
  { value: "FINANCE", label: "Finance" },
  { value: "DIRECTOR", label: "Director" },
  { value: "EXTERNAL", label: "External" },
];

export type UserAccessInput = {
  email?: string;
  role: UserRole;
  isSuperAdmin: boolean;
  entityIds: string[];
  moduleOverrides: Partial<Record<ModuleName, import("@/lib/permissions/types").PermissionLevel>>;
  documentCategories: string[];
};
