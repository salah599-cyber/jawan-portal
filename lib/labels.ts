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

export const EXPENSE_ATTACHMENT_TYPE_LABELS: Record<string, string> = {
  INVOICE: "Invoice",
  PAYMENT_SLIP: "Payment Slip",
  CHEQUE_COPY: "Cheque Copy",
  OTHER: "Other",
};

export const LAND_USE_LABELS: Record<string, string> = {
  RESIDENTIAL: "Residential",
  COMMERCIAL: "Commercial",
  AGRICULTURAL: "Agricultural",
  INDUSTRIAL: "Industrial",
  MIXED: "Mixed Use",
  OTHER: "Other",
};

export const LAND_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  KROOKI: "Krooki",
  MULKIA: "Mulkia",
  OTHER: "Other",
};

export const VEHICLE_CLASS_LABELS: Record<string, string> = {
  PRIVATE: "Private",
  COMMERCIAL: "Commercial",
  GOVERNMENT: "Government",
  DIPLOMATIC: "Diplomatic",
  OTHER: "Other",
};

export const VEHICLE_BODY_TYPE_LABELS: Record<string, string> = {
  SALOON: "Saloon",
  SUV: "SUV / 4WD",
  PICKUP: "Pickup",
  COUPE: "Coupe",
  VAN: "Van",
  MOTORCYCLE: "Motorcycle",
  OTHER: "Other",
};

export const VEHICLE_FUEL_TYPE_LABELS: Record<string, string> = {
  PETROL: "Petrol",
  DIESEL: "Diesel",
  ELECTRIC: "Electric",
  HYBRID: "Hybrid",
  OTHER: "Other",
};

export const VEHICLE_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  MULKIA: "Motor Vehicle License (Mulkia)",
  INSURANCE: "Insurance",
  OTHER: "Other",
};
