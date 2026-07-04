import { db } from "@/lib/db";
import type { PeCompanyStatus } from "@/lib/generated/prisma/client";
import { recordAssetValuation } from "@/lib/portfolio/valuations";
import { sumDecimals, toNumber } from "./helpers";
import { getPeCarryingValue } from "./valuation";

const PE_PATH = "/portfolio/pe";

export function peStatusToAssetStatus(status: PeCompanyStatus) {
  switch (status) {
    case "EXITED":
      return "EXITED" as const;
    case "WRITTEN_OFF":
      return "EXITED" as const;
    case "WATCHLIST":
      return "MONITOR" as const;
    case "FOLLOW_ON_PENDING":
      return "MONITOR" as const;
    default:
      return "ACTIVE" as const;
  }
}

export async function syncPeCompanyAsset(companyId: string) {
  const company = await db.peCompany.findUnique({
    where: { id: companyId },
    include: {
      investments: true,
      valuations: { orderBy: { valuationDate: "desc" }, take: 1 },
      exit: true,
    },
  });

  if (!company?.assetId) return;

  const totalInvested = sumDecimals(company.investments.map((i) => i.amountReporting));
  const latestValuation = company.valuations[0];
  const fairValue = latestValuation
    ? toNumber(latestValuation.stakeFairValueReporting)
    : null;
  const carryingValue = getPeCarryingValue(totalInvested, fairValue);

  const firstInvestment = company.investments
    .slice()
    .sort((a, b) => a.investmentDate.getTime() - b.investmentDate.getTime())[0];

  await db.asset.update({
    where: { id: company.assetId },
    data: {
      name: company.name,
      status: peStatusToAssetStatus(company.status),
      currency: company.reportingCurrency,
      acquisitionDate: firstInvestment?.investmentDate,
      acquisitionCost: totalInvested > 0 ? totalInvested.toString() : null,
      currentValue: carryingValue > 0 ? carryingValue.toString() : null,
      valueUpdatedAt: latestValuation?.valuationDate ?? undefined,
      exitedAt: company.exit?.exitDate ?? (company.status === "EXITED" ? new Date() : null),
    },
  });

  if (carryingValue > 0) {
    await recordAssetValuation({
      assetId: company.assetId,
      value: carryingValue,
      currency: company.reportingCurrency,
      valuedAt: latestValuation?.valuationDate ?? new Date(),
    });
  }
}

export { PE_PATH };
