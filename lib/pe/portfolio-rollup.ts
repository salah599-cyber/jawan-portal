import type { PeCompanyListRow } from "@/lib/data/pe-portfolio";
import { formatMoney } from "@/lib/format";
import { ACTIVE_PE_COMPANY_STATUSES, getPeCarryingValue } from "@/lib/pe/valuation";

function isActivePeCompany(status: string) {
  return (ACTIVE_PE_COMPANY_STATUSES as readonly string[]).includes(status);
}

export function applyPeCarryingDelta(
  companies: PeCompanyListRow[],
  assetValuesById: Map<string, number>,
  addAmount: (currency: string, amount: number) => void,
) {
  for (const company of companies) {
    if (!isActivePeCompany(company.status)) continue;

    const carrying = getPeCarryingValue(company.totalInvested, company.latestFairValue);
    if (carrying <= 0 || !company.assetId) continue;

    const recorded = assetValuesById.get(company.assetId) ?? 0;
    if (recorded >= carrying) continue;

    addAmount(company.reportingCurrency, carrying - recorded);
  }
}

export function formatPeCarryingDetail(companies: PeCompanyListRow[]) {
  const totalsByCurrency = new Map<string, number>();

  for (const company of companies) {
    if (!isActivePeCompany(company.status)) continue;
    const carrying = getPeCarryingValue(company.totalInvested, company.latestFairValue);
    if (carrying <= 0) continue;
    totalsByCurrency.set(
      company.reportingCurrency,
      (totalsByCurrency.get(company.reportingCurrency) ?? 0) + carrying,
    );
  }

  if (totalsByCurrency.size === 0) return undefined;
  return [...totalsByCurrency.entries()]
    .map(([currency, amount]) => formatMoney(amount, currency))
    .join(" · ");
}

export function countActivePeCompanies(companies: PeCompanyListRow[]) {
  return companies.filter((company) => isActivePeCompany(company.status)).length;
}
