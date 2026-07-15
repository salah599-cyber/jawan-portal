import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { CashSummaryCards } from "@/components/cash/cash-summary-cards";
import { CashBreakdown } from "@/components/cash/cash-breakdown";
import { CashAccountsTable } from "@/components/cash/cash-accounts-table";
import { UploadStatementForm } from "@/components/cash/upload-statement-form";
import { StatementImportHistory } from "@/components/cash/statement-import-history";
import {
  getCashSummary,
  getCashStatementImports,
  listCashAccountCandidates,
} from "@/lib/data/cash-management";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CashManagementPage() {
  const ctx = await requireModuleAccess("CASH_MANAGEMENT");
  const [summary, accountCandidates, importHistory] = await Promise.all([
    getCashSummary(ctx),
    listCashAccountCandidates(ctx),
    getCashStatementImports(ctx),
  ]);
  const canEdit = canWrite(ctx, "CASH_MANAGEMENT");

  return (
    <>
      <PlatformHeader title="Cash Management" />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Cash Position</h2>
            <p className="text-sm text-muted-foreground">
              Balance tracking for accounts included in cash position. Reference-only accounts are managed under Bank Details.
            </p>
          </div>
          {canEdit ? <AddLinkButton href="/cash/new" label="Add Account" /> : null}
        </div>

        <CashSummaryCards summary={summary} />

        <CashBreakdown
          byBank={summary.byBank}
          byEntity={summary.byEntity}
          byCurrency={summary.byCurrency}
        />

        {canEdit ? (
          <UploadStatementForm
            accounts={accountCandidates}
            description="Upload PDF bank statements to extract closing balances. Each statement is parsed automatically — review and confirm before updating account balances."
          />
        ) : null}

        {canEdit ? <StatementImportHistory imports={importHistory} /> : null}

        <Card>
          <CardHeader>
            <CardTitle>All Accounts</CardTitle>
            <CardDescription>
              Accounts included in cash position. Balances converted to OMR using the latest available FX rates. Accounts not updated in 30 days are flagged.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CashAccountsTable accounts={summary.accounts} showActions={canEdit} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
