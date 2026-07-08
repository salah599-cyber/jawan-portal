import type { InterestCalculationMethod, PaymentFrequency } from "@/lib/generated/prisma/client";

export function periodsPerYear(frequency: PaymentFrequency | null | undefined): number {
  switch (frequency) {
    case "QUARTERLY":
      return 4;
    case "SEMI_ANNUAL":
      return 2;
    case "ANNUAL":
    case "BULLET":
      return 1;
    case "MONTHLY":
    default:
      return 12;
  }
}

export function calculatePeriodInterest(
  method: InterestCalculationMethod | null | undefined,
  annualRatePct: number,
  principal: number,
  outstandingBalance: number,
  frequency: PaymentFrequency | null | undefined,
): number {
  if (annualRatePct <= 0) return 0;

  const base = method === "FIXED_RATE" ? principal : outstandingBalance;
  const interest = base * (annualRatePct / 100) / periodsPerYear(frequency);
  return Math.round(interest * 100) / 100;
}

export function splitLoanPayment(
  loan: {
    amount: number;
    interestRate: number | null;
    interestCalculationMethod: InterestCalculationMethod | null | undefined;
    paymentFrequency: PaymentFrequency | null | undefined;
  },
  outstandingBalance: number,
  paymentAmount: number,
  manualPrincipal?: number,
  manualInterest?: number,
): { principalPortion: number; interestPortion: number } {
  if (manualPrincipal != null && manualInterest != null) {
    return {
      principalPortion: roundCurrency(manualPrincipal),
      interestPortion: roundCurrency(manualInterest),
    };
  }

  const interestPortion = Math.min(
    calculatePeriodInterest(
      loan.interestCalculationMethod,
      loan.interestRate ?? 0,
      loan.amount,
      outstandingBalance,
      loan.paymentFrequency,
    ),
    paymentAmount,
  );

  const principalPortion = Math.min(
    roundCurrency(paymentAmount - interestPortion),
    outstandingBalance,
  );

  return {
    principalPortion,
    interestPortion: roundCurrency(paymentAmount - principalPortion),
  };
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function summarizeLoanInterest(
  loan: {
    amount: { toString(): string };
    outstandingBalance: { toString(): string } | null;
    interestRate: { toString(): string } | null;
    interestCalculationMethod: InterestCalculationMethod | null;
    paymentFrequency: PaymentFrequency | null;
    payments: Array<{
      principalPortion: { toString(): string } | null;
      interestPortion: { toString(): string } | null;
    }>;
  },
) {
  const principal = parseFloat(loan.amount.toString());
  const outstanding = parseFloat(
    (loan.outstandingBalance ?? loan.amount).toString(),
  );
  const annualRate = loan.interestRate ? parseFloat(loan.interestRate.toString()) : 0;

  const totalInterestPaid = loan.payments.reduce(
    (sum, payment) => sum + parseFloat(payment.interestPortion?.toString() ?? "0"),
    0,
  );
  const totalPrincipalPaid = loan.payments.reduce(
    (sum, payment) => sum + parseFloat(payment.principalPortion?.toString() ?? "0"),
    0,
  );
  const periodInterest = calculatePeriodInterest(
    loan.interestCalculationMethod,
    annualRate,
    principal,
    outstanding,
    loan.paymentFrequency,
  );

  return {
    principal,
    outstanding,
    annualRate,
    periodInterest,
    totalInterestPaid,
    totalPrincipalPaid,
    method: loan.interestCalculationMethod ?? "REDUCING_BALANCE",
  };
}
