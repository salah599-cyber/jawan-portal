import type { ModuleName } from "@/lib/permissions/types";

export type ReportId =
  | "net-worth"
  | "consolidated-omr"
  | "asset-register"
  | "asset-allocation"
  | "liabilities"
  | "public-equity"
  | "pe-portfolio"
  | "lp-fund-portfolio"
  | "cheques"
  | "expenses"
  | "exits"
  | "exit-analytics"
  | "lands"
  | "vehicles"
  | "companies"
  | "document-expiry"
  | "insurance-register"
  | "family-register"
  | "succession-status"
  | "contacts-directory"
  | "bank-accounts"
  | "cash-balances"
  | "cash-position"
  | "rental-income"
  | "dividend-distribution-income"
  | "total-portfolio-income"
  | "portfolio-performance"
  | "proposals"
  | "valuation-history"
  | "re-portfolio"
  | "re-rent-register"
  | "re-leases"
  | "re-expenses"
  | "re-valuation-history";

export type ReportCategory =
  | "balance-sheet"
  | "portfolio"
  | "operations"
  | "registers"
  | "real-estate"
  | "advanced";

export type ReportDefinition = {
  id: ReportId;
  title: string;
  description: string;
  category: ReportCategory;
  requiredModules: ModuleName[];
  requiredModulesAny?: ModuleName[];
  supportsEntityFilter: boolean;
  supportsDateRange: boolean;
};

export type ReportParams = {
  entityId?: string;
  fromDate?: string;
  toDate?: string;
};

export type ReportMetric = {
  label: string;
  value: string;
  detail?: string;
};

export type ReportColumn = {
  key: string;
  label: string;
  align?: "left" | "right";
};

export type ReportResult = {
  reportId: ReportId;
  title: string;
  description: string;
  generatedAt: Date;
  entityName?: string;
  metrics: ReportMetric[];
  columns: ReportColumn[];
  rows: Record<string, string | number | null>[];
  footnotes: string[];
};

export type ReportExportFormat = "xlsx" | "csv";
