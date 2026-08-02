import Link from "next/link";
import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { RowActions } from "@/components/platform/row-actions";
import { listLoans, deleteLoan } from "@/lib/actions/loans";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import {
  INTEREST_CALCULATION_METHOD_LABELS,
  LIABILITY_STATUS_LABELS,
  LIABILITY_TYPE_LABELS,
  PAYMENT_FREQUENCY_LABELS,
} from "@/lib/labels";
import { calculatePeriodInterest } from "@/lib/loans/interest";
import { formatMoney, formatDate, formatOmr } from "@/lib/format";
import { buildLoansSummary } from "@/lib/data/loans-summary";
import { LoansSummaryCards } from "@/components/loans/loans-summary-cards";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function loanBalance(loan: { outstandingBalance: { toString(): string } | null; amount: { toString(): string } }) {
  return loan.outstandingBalance ?? loan.amount;
}

export default async function LoansPage() {
  const ctx = await requireModuleAccess("LOANS");
  const loans = await listLoans();
  const showAdd = canWrite(ctx, "LOANS");

  const activeLoans = loans.filter((l) => l.status === "ACTIVE");
  const summary = await buildLoansSummary(loans);

  return (
    <>
      <PlatformHeader title="Loan Management" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <LoansSummaryCards summary={summary} />

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Loans & Facilities</CardTitle>
              <CardDescription>
                Track term loans, mortgages, and credit facilities. Principal repayments reduce outstanding balance automatically; interest is tracked separately.
              </CardDescription>
            </div>
            {showAdd ? <AddLinkButton href="/loans/new" label="Register Loan" /> : null}
          </CardHeader>
          <CardContent>
            {loans.length === 0 ? (
              <p className="text-sm text-muted-foreground">No loans registered yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loan</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Lender</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Interest Method</TableHead>
                    <TableHead className="text-right">Period Interest</TableHead>
                    <TableHead>Maturity</TableHead>
                    <TableHead>Last Payment</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Docs</TableHead>
                    {showAdd ? <TableHead className="w-[60px]">Actions</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((loan) => {
                    const outstanding = parseFloat(loanBalance(loan).toString());
                    const principal = parseFloat(loan.amount.toString());
                    const annualRate = loan.interestRate ? parseFloat(loan.interestRate.toString()) : 0;
                    const periodInterest = calculatePeriodInterest(
                      loan.interestCalculationMethod,
                      annualRate,
                      principal,
                      outstanding,
                      loan.paymentFrequency,
                    );

                    return (
                      <TableRow key={loan.id}>
                        <TableCell className="font-medium">
                          <Link href={"/loans/" + loan.id} className="hover:underline">
                            {loan.name}
                          </Link>
                        </TableCell>
                        <TableCell>{LIABILITY_TYPE_LABELS[loan.type] ?? loan.type}</TableCell>
                        <TableCell>{loan.lender ?? "-"}</TableCell>
                        <TableCell>{loan.entity.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{LIABILITY_STATUS_LABELS[loan.status] ?? loan.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatMoney(loanBalance(loan), loan.currency)}</TableCell>
                        <TableCell>{loan.interestRate ? loan.interestRate.toString() + "%" : "-"}</TableCell>
                        <TableCell>
                          {INTEREST_CALCULATION_METHOD_LABELS[loan.interestCalculationMethod ?? "REDUCING_BALANCE"] ??
                            "Reducing Balance"}
                        </TableCell>
                        <TableCell className="text-right">
                          {annualRate > 0 ? formatMoney(periodInterest, loan.currency) : "-"}
                        </TableCell>
                        <TableCell>{formatDate(loan.maturityDate)}</TableCell>
                        <TableCell>{formatDate(loan.lastPaymentAt)}</TableCell>
                        <TableCell>
                          {loan.paymentAmount
                            ? formatMoney(loan.paymentAmount, loan.currency) +
                              (loan.paymentFrequency
                                ? " / " + (PAYMENT_FREQUENCY_LABELS[loan.paymentFrequency] ?? loan.paymentFrequency)
                                : "")
                            : "-"}
                        </TableCell>
                        <TableCell>{loan.documents.length}</TableCell>
                        {showAdd ? (
                          <TableCell>
                            <RowActions
                              editHref={"/loans/" + loan.id + "/edit"}
                              itemId={loan.id}
                              itemLabel={loan.name}
                              deleteAction={deleteLoan}
                            />
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {activeLoans.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Interest Summary</CardTitle>
              <CardDescription>
                Principal repaid: {formatOmr(summary.totalPrincipalPaidOmr)} · Interest repaid: {formatOmr(summary.totalInterestPaidOmr)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loan</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Period Interest</TableHead>
                    <TableHead className="text-right">Interest Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeLoans.map((loan) => {
                    const outstanding = parseFloat(loanBalance(loan).toString());
                    const principal = parseFloat(loan.amount.toString());
                    const annualRate = loan.interestRate ? parseFloat(loan.interestRate.toString()) : 0;
                    const interestPaid = loan.payments.reduce(
                      (sum, payment) => sum + parseFloat(payment.interestPortion?.toString() ?? "0"),
                      0,
                    );

                    return (
                      <TableRow key={loan.id}>
                        <TableCell>
                          <Link href={"/loans/" + loan.id} className="hover:underline">
                            {loan.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {INTEREST_CALCULATION_METHOD_LABELS[loan.interestCalculationMethod ?? "REDUCING_BALANCE"]}
                        </TableCell>
                        <TableCell className="text-right">{formatMoney(outstanding, loan.currency)}</TableCell>
                        <TableCell className="text-right">
                          {annualRate > 0
                            ? formatMoney(
                                calculatePeriodInterest(
                                  loan.interestCalculationMethod,
                                  annualRate,
                                  principal,
                                  outstanding,
                                  loan.paymentFrequency,
                                ),
                                loan.currency,
                              )
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">{formatMoney(interestPaid, loan.currency)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}
      </main>
    </>
  );
}
