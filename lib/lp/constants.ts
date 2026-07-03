export const LP_PATH = "/portfolio/fund-lp";

export const LP_FUND_STRATEGY_LABELS: Record<string, string> = {
  BUYOUT: "Buyout",
  VENTURE: "Venture",
  GROWTH: "Growth",
  REAL_ASSETS: "Real Assets",
  CREDIT: "Credit",
  FUND_OF_FUNDS: "Fund of Funds",
  OTHER: "Other",
};

export const LP_FUND_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  FULLY_INVESTED: "Fully Invested",
  HARVESTING: "Harvesting",
  LIQUIDATED: "Liquidated",
};

export const LP_COMMITMENT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  FULLY_CALLED: "Fully Called",
  HARVESTING: "Harvesting",
  CLOSED: "Closed",
  WRITTEN_OFF: "Written Off",
};

export const LP_CAPITAL_CALL_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

export const LP_DISTRIBUTION_TYPE_LABELS: Record<string, string> = {
  RETURN_OF_CAPITAL: "Return of Capital",
  INCOME: "Income",
  CARRY: "Carry",
  RECALLABLE: "Recallable",
  OTHER: "Other",
};

export const LP_NAV_SOURCE_LABELS: Record<string, string> = {
  GP_REPORT: "GP Report",
  ESTIMATE: "Estimate",
  MANUAL: "Manual",
};

export const LP_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  CAPITAL_CALL_NOTICE: "Capital Call Notice",
  GP_REPORT: "GP Report",
  QUARTERLY_LETTER: "Quarterly Letter",
  SIDE_LETTER: "Side Letter",
  SUBSCRIPTION_DOC: "Subscription Document",
  OTHER: "Other",
};

export const ACTIVE_LP_COMMITMENT_STATUSES = [
  "ACTIVE",
  "FULLY_CALLED",
  "HARVESTING",
] as const;
