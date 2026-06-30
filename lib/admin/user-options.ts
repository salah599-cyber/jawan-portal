import type { DocumentCategory, UserRole } from "@/lib/generated/prisma/client";
import type { ModuleName } from "@/lib/permissions/types";

export const MANAGEABLE_MODULES: { module: ModuleName; label: string }[] = [
  { module: "DASHBOARD", label: "Dashboard" },
  { module: "ASSETS", label: "Assets" },
  { module: "LANDS", label: "Lands" },
  { module: "CARS", label: "Cars" },
  { module: "COMPANIES", label: "Companies" },
  { module: "DOCUMENTS", label: "Documents" },
  { module: "EXPENSES", label: "Expenses" },
  { module: "REPORTS", label: "Reports" },
  { module: "USERS", label: "Users" },
  { module: "AUDIT", label: "Audit Log" },
];

export const USER_ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "PRINCIPAL", label: "Principal" },
  { value: "SIGNATORY", label: "Signatory" },
  { value: "FINANCE", label: "Finance" },
  { value: "DIRECTOR", label: "Director" },
  { value: "EXTERNAL", label: "External" },
];

export const DOCUMENT_CATEGORY_OPTIONS: { value: DocumentCategory; label: string }[] = [
  { value: "KYC", label: "KYC" },
  { value: "LEGAL", label: "Legal" },
  { value: "PROPERTY", label: "Property" },
  { value: "CORPORATE", label: "Corporate" },
  { value: "TAX", label: "Tax" },
  { value: "BANKING", label: "Banking" },
  { value: "OTHER", label: "Other" },
];

export type UserAccessInput = {
  email?: string;
  role: UserRole;
  isSuperAdmin: boolean;
  entityIds: string[];
  moduleOverrides: Partial<Record<ModuleName, import("@/lib/permissions/types").PermissionLevel>>;
  documentCategories: DocumentCategory[];
};
