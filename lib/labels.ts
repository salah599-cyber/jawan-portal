export const ASSET_CATEGORY_LABELS: Record<string, string> = {
  REAL_ESTATE: "Real Estate",
  PRIVATE_EQUITY: "Private Equity",
  PUBLIC_EQUITY: "Public Equity",
  FIXED_ASSET: "Fixed Asset",
  BONDS: "Bonds",
  CASH: "Cash",
  OTHER: "Other",
};

export const ASSET_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  MONITOR: "Monitor",
  EXITED: "Exited",
  DEFERRED: "Deferred",
};

export const DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  KYC: "KYC",
  LEGAL: "Legal",
  PROPERTY: "Property",
  CORPORATE: "Corporate",
  TAX: "Tax",
  BANKING: "Banking",
  OTHER: "Other",
};

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  VALID: "Valid",
  EXPIRING_SOON: "Expiring Soon",
  EXPIRED: "Expired",
  PENDING: "Pending",
  UNDER_REVIEW: "Under Review",
};

export const EXPENSE_STATUS_LABELS: Record<string, string> = {
  PAID: "Paid",
  PENDING: "Pending",
  OVERDUE: "Overdue",
};

export const EXPENSE_CATEGORY_OPTIONS = [
  "Operations",
  "Property",
  "Legal",
  "Tax",
  "Insurance",
  "Utilities",
  "Professional Fees",
  "Other",
] as const;
