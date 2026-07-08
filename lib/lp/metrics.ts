import { calculateXirr } from "@/lib/lp/xirr";
import { resolveCapitalCallStatus, sumDecimals, toNumber } from "@/lib/lp/helpers";

export type LpCashFlowInput = {
  callDate: Date;
  dueDate?: Date | null;
  amount: { toString(): string } | number;
  status: string;
  paidDate?: Date | null;
};

export type LpDistributionInput = {
  distributionDate: Date;
  amount: { toString(): string } | number;
  isRecallable: boolean;
  recalledAmount?: { toString(): string } | number | null;
};

export type LpNavInput = {
  asOfDate: Date;
  nav: { toString(): string } | number;
  gpReportedTvpi?: { toString(): string } | number | null;
  gpReportedIrr?: { toString(): string } | number | null;
};

export type LpCommitmentMetricsInput = {
  commitmentAmount: { toString(): string } | number;
  capitalCalls: LpCashFlowInput[];
  distributions: LpDistributionInput[];
  navUpdates: LpNavInput[];
};

export type LpCommitmentMetrics = {
  paidInCapital: number;
  unfundedCommitment: number;
  totalDistributions: number;
  recallableOutstanding: number;
  latestNav: number | null;
  latestNavDate: Date | null;
  carryingValue: number;
  dpi: number | null;
  rvpi: number | null;
  tvpi: number | null;
  netIrr: number | null;
  gpReportedTvpi: number | null;
  gpReportedIrr: number | null;
};

export function getLpCarryingValue(paidInCapital: number, latestNav: number | null): number {
  if (latestNav != null && latestNav > 0) return latestNav;
  return paidInCapital > 0 ? paidInCapital : 0;
}

function safeRatio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

export function computeLpCommitmentMetrics(input: LpCommitmentMetricsInput): LpCommitmentMetrics {
  const commitmentAmount = toNumber(input.commitmentAmount);

  const paidInCapital = sumDecimals(
    input.capitalCalls
      .filter((call) => resolveCapitalCallStatus(call.status, call.dueDate) === "PAID")
      .map((call) => call.amount),
  );

  const recallableOutstanding = input.distributions.reduce((sum, dist) => {
    if (!dist.isRecallable) return sum;
    const recalled = toNumber(dist.recalledAmount);
    const outstanding = toNumber(dist.amount) - recalled;
    return sum + Math.max(0, outstanding);
  }, 0);

  const unfundedCommitment = Math.max(
    0,
    commitmentAmount - paidInCapital + recallableOutstanding,
  );

  const totalDistributions = sumDecimals(input.distributions.map((d) => d.amount));

  const latestNavUpdate = input.navUpdates
    .slice()
    .sort((a, b) => b.asOfDate.getTime() - a.asOfDate.getTime())[0];

  const latestNav = latestNavUpdate ? toNumber(latestNavUpdate.nav) : null;
  const latestNavDate = latestNavUpdate?.asOfDate ?? null;
  const carryingValue = getLpCarryingValue(paidInCapital, latestNav);

  const dpi = safeRatio(totalDistributions, paidInCapital);
  const rvpi = safeRatio(latestNav ?? 0, paidInCapital);
  const tvpi = safeRatio((latestNav ?? 0) + totalDistributions, paidInCapital);

  const gpReportedTvpi = latestNavUpdate?.gpReportedTvpi
    ? toNumber(latestNavUpdate.gpReportedTvpi)
    : null;
  const gpReportedIrr = latestNavUpdate?.gpReportedIrr
    ? toNumber(latestNavUpdate.gpReportedIrr)
    : null;

  const cashFlows: { date: Date; amount: number }[] = [];

  for (const call of input.capitalCalls) {
    if (resolveCapitalCallStatus(call.status, call.dueDate) !== "PAID") continue;
    const date = call.paidDate ?? call.callDate;
    cashFlows.push({ date, amount: -toNumber(call.amount) });
  }

  for (const dist of input.distributions) {
    cashFlows.push({
      date: dist.distributionDate,
      amount: toNumber(dist.amount),
    });
  }

  if (latestNav != null && latestNavDate) {
    cashFlows.push({ date: latestNavDate, amount: latestNav });
  }

  cashFlows.sort((a, b) => a.date.getTime() - b.date.getTime());
  const netIrr = calculateXirr(cashFlows);

  return {
    paidInCapital,
    unfundedCommitment,
    totalDistributions,
    recallableOutstanding,
    latestNav,
    latestNavDate,
    carryingValue,
    dpi,
    rvpi,
    tvpi,
    netIrr,
    gpReportedTvpi,
    gpReportedIrr,
  };
}
