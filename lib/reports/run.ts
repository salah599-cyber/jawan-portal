import type { UserContext } from "@/lib/permissions/types";
import { canRunReport } from "@/lib/reports/access";
import {
  buildAssetAllocationReport,
  buildAssetRegisterReport,
  buildBankAccountsReport,
  buildChequesReport,
  buildCompaniesReport,
  buildConsolidatedOmrReport,
  buildDocumentExpiryReport,
  buildExitsReport,
  buildExpensesReport,
  buildLandsReport,
  buildLiabilitiesReport,
  buildNetWorthReport,
  buildPePortfolioReport,
  buildProposalsReport,
  buildPublicEquityReport,
  buildValuationHistoryReport,
  buildVehiclesReport,
} from "@/lib/reports/builders/index";
import type { ReportId, ReportParams, ReportResult } from "@/lib/reports/types";

const BUILDERS: Record<
  ReportId,
  (ctx: UserContext, params: ReportParams) => Promise<ReportResult>
> = {
  "net-worth": buildNetWorthReport,
  "consolidated-omr": buildConsolidatedOmrReport,
  "asset-register": buildAssetRegisterReport,
  "asset-allocation": buildAssetAllocationReport,
  liabilities: buildLiabilitiesReport,
  "public-equity": buildPublicEquityReport,
  "pe-portfolio": buildPePortfolioReport,
  cheques: buildChequesReport,
  expenses: buildExpensesReport,
  exits: buildExitsReport,
  lands: buildLandsReport,
  vehicles: buildVehiclesReport,
  companies: buildCompaniesReport,
  "document-expiry": buildDocumentExpiryReport,
  "bank-accounts": buildBankAccountsReport,
  proposals: buildProposalsReport,
  "valuation-history": buildValuationHistoryReport,
};

export async function runReport(
  ctx: UserContext,
  reportId: ReportId,
  params: ReportParams = {},
): Promise<ReportResult> {
  if (!canRunReport(ctx, reportId)) {
    throw new Error("You do not have permission to run this report.");
  }

  const builder = BUILDERS[reportId];
  if (!builder) {
    throw new Error(`Unknown report: ${reportId}`);
  }

  return builder(ctx, params);
}
