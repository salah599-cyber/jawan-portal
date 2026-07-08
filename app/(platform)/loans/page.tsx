import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { LoansTable } from "@/components/loans/loans-table";
import { listLoans } from "@/lib/actions/loans";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { formatMoney } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function loanBalance(loan: { outstandingBalance: { toString(): string } | null; amount: { toString(): string } }) {
  return loan.outstandingBalance ?? loan.amount;
}

export default async function LoansPage() {
  const ctx = await requireModuleAccess("LOANS");
  const loans = await listLoans();
  const showAdd = canWrite(ctx, "LOANS");

  const activeLoans = loans.filter((l) => l.status === "ACTIVE");
  const totalActive = activeLoans.reduce(
    (sum, loan) => sum + parseFloat(loanBalance(loan).toString()),
    0,
  );

  return (
    <>
      <PlatformHeader title="Loan Management" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Loans & Facilities</CardTitle>
              <CardDescription>
                Track term loans, mortgages, and credit facilities — {activeLoans.length} active
                {activeLoans.length > 0 ? ", " + formatMoney(totalActive, activeLoans[0]?.currency ?? "OMR") + " outstanding (mixed currencies not combined)" : ""}.
              </CardDescription>
            </div>
            {showAdd ? <AddLinkButton href="/loans/new" label="Register Loan" /> : null}
          </CardHeader>
          <CardContent>
            <LoansTable loans={loans} showAdd={showAdd} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
