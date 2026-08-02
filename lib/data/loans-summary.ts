import { convertToOmr } from "@/lib/fx";
import { calculatePeriodInterest } from "@/lib/loans/interest";
import type { InterestCalculationMethod, PaymentFrequency } from "@/lib/generated/prisma/client";

type LoanPayment = {
  principalPortion: { toString(): string } | null;
  interestPortion: { toString(): string } | null;
};

export type LoanForSummary = {
  status: string;
  currency: string;
  outstandingBalance: { toString(): string } | null;
  amount: { toString(): string };
  interestRate: { toString(): string } | null;
  interestCalculationMethod: InterestCalculationMethod | null;
  paymentFrequency: PaymentFrequency | null;
  payments: LoanPayment[];
};

export type LoansCurrencyBreakdown = {
  currency: string;
  loanCount: number;
  outstandingNative: number;
  outstandingOmr: number;
  interestPaidNative: number;
  interestPaidOmr: number;
  periodInterestNative: number;
  periodInterestOmr: number;
};

export type LoansSummary = {
  activeCount: number;
  totalOutstandingOmr: number;
  totalInterestPaidOmr: number;
  totalPeriodInterestOmr: number;
  totalPrincipalPaidOmr: number;
  byCurrency: LoansCurrencyBreakdown[];
};

function loanBalance(loan: Pick<LoanForSummary, "outstandingBalance" | "amount">) {
  return loan.outstandingBalance ?? loan.amount;
}

function periodInterestForLoan(loan: LoanForSummary): number {
  const principal = parseFloat(loan.amount.toString());
  const outstanding = parseFloat(loanBalance(loan).toString());
  const annualRate = loan.interestRate ? parseFloat(loan.interestRate.toString()) : 0;
  return calculatePeriodInterest(
    loan.interestCalculationMethod,
    annualRate,
    principal,
    outstanding,
    loan.paymentFrequency,
  );
}

function interestPaidForLoan(loan: LoanForSummary): number {
  return loan.payments.reduce(
    (sum, payment) => sum + parseFloat(payment.interestPortion?.toString() ?? "0"),
    0,
  );
}

function principalPaidForLoan(loan: LoanForSummary): number {
  return loan.payments.reduce(
    (sum, payment) => sum + parseFloat(payment.principalPortion?.toString() ?? "0"),
    0,
  );
}

export async function buildLoansSummary(loans: LoanForSummary[]): Promise<LoansSummary> {
  const activeLoans = loans.filter((loan) => loan.status === "ACTIVE");
  const currencyMap = new Map<
    string,
    {
      loanCount: number;
      outstandingNative: number;
      interestPaidNative: number;
      periodInterestNative: number;
    }
  >();

  for (const loan of loans) {
    const currency = loan.currency || "OMR";
    const entry = currencyMap.get(currency) ?? {
      loanCount: 0,
      outstandingNative: 0,
      interestPaidNative: 0,
      periodInterestNative: 0,
    };

    entry.loanCount += 1;
    entry.interestPaidNative += interestPaidForLoan(loan);

    if (loan.status === "ACTIVE") {
      entry.outstandingNative += parseFloat(loanBalance(loan).toString());
      entry.periodInterestNative += periodInterestForLoan(loan);
    }

    currencyMap.set(currency, entry);
  }

  const byCurrency = await Promise.all(
    [...currencyMap.entries()].map(async ([currency, entry]) => ({
      currency,
      loanCount: entry.loanCount,
      outstandingNative: entry.outstandingNative,
      outstandingOmr: await convertToOmr(entry.outstandingNative, currency),
      interestPaidNative: entry.interestPaidNative,
      interestPaidOmr: await convertToOmr(entry.interestPaidNative, currency),
      periodInterestNative: entry.periodInterestNative,
      periodInterestOmr: await convertToOmr(entry.periodInterestNative, currency),
    })),
  );

  byCurrency.sort((a, b) => b.outstandingOmr - a.outstandingOmr);

  const totalOutstandingOmr = byCurrency.reduce((sum, row) => sum + row.outstandingOmr, 0);
  const totalInterestPaidOmr = byCurrency.reduce((sum, row) => sum + row.interestPaidOmr, 0);
  const totalPeriodInterestOmr = byCurrency.reduce((sum, row) => sum + row.periodInterestOmr, 0);

  const totalPrincipalPaidOmr = (
    await Promise.all(
      loans.map(async (loan) => convertToOmr(principalPaidForLoan(loan), loan.currency || "OMR")),
    )
  ).reduce((sum, amount) => sum + amount, 0);

  return {
    activeCount: activeLoans.length,
    totalOutstandingOmr,
    totalInterestPaidOmr,
    totalPeriodInterestOmr,
    totalPrincipalPaidOmr,
    byCurrency,
  };
}
