import { calculateXirr, formatIrr, formatMultiple } from "@/lib/lp/xirr";
import { toNumber } from "@/lib/pe/helpers";
import { getPeCarryingValue } from "@/lib/pe/valuation";

export type PeCashFlowInput = {
  date: Date;
  amount: { toString(): string } | number;
};

export type PeCompanyMetricsInput = {
  investments: PeCashFlowInput[];
  distributions: PeCashFlowInput[];
  latestFairValue: number | null;
  latestValuationDate: Date | null;
  exitProceeds?: number | null;
  exitDate?: Date | null;
};

export type PeCompanyMetrics = {
  totalInvested: number;
  totalDistributed: number;
  carryingValue: number;
  totalValue: number;
  moic: number | null;
  netIrr: number | null;
};

function safeRatio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

/**
 * PE / VC company metrics.
 * MOIC = (carrying value + distributions) / invested capital.
 * Carrying value prefers exit proceeds, then latest fair value, then cost.
 * Net IRR is money-weighted (XIRR) using investment outflows, distribution
 * inflows, and a terminal residual (exit proceeds or fair value).
 */
export function computePeCompanyMetrics(input: PeCompanyMetricsInput): PeCompanyMetrics {
  const totalInvested = input.investments.reduce((sum, row) => sum + toNumber(row.amount), 0);
  const totalDistributed = input.distributions.reduce(
    (sum, row) => sum + toNumber(row.amount),
    0,
  );

  const exitProceeds =
    input.exitProceeds != null && input.exitProceeds > 0 ? input.exitProceeds : null;
  const carryingValue =
    exitProceeds ?? getPeCarryingValue(totalInvested, input.latestFairValue);
  const totalValue = carryingValue + totalDistributed;
  const moic = safeRatio(totalValue, totalInvested);

  const cashFlows: { date: Date; amount: number }[] = [];

  for (const investment of input.investments) {
    const amount = toNumber(investment.amount);
    if (amount <= 0) continue;
    cashFlows.push({ date: investment.date, amount: -amount });
  }

  for (const distribution of input.distributions) {
    const amount = toNumber(distribution.amount);
    if (amount === 0) continue;
    cashFlows.push({ date: distribution.date, amount });
  }

  if (exitProceeds != null && input.exitDate) {
    cashFlows.push({ date: input.exitDate, amount: exitProceeds });
  } else if (
    input.latestFairValue != null &&
    input.latestFairValue > 0 &&
    input.latestValuationDate
  ) {
    cashFlows.push({
      date: input.latestValuationDate,
      amount: input.latestFairValue,
    });
  }

  cashFlows.sort((a, b) => a.date.getTime() - b.date.getTime());
  const netIrr = calculateXirr(cashFlows);

  return {
    totalInvested,
    totalDistributed,
    carryingValue,
    totalValue,
    moic,
    netIrr,
  };
}

export function aggregatePePortfolioMoic(companies: PeCompanyMetrics[]): number | null {
  const invested = companies.reduce((sum, row) => sum + row.totalInvested, 0);
  const totalValue = companies.reduce((sum, row) => sum + row.totalValue, 0);
  return safeRatio(totalValue, invested);
}

export { formatIrr, formatMultiple };
