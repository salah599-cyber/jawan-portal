import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { EditLinkButton } from "@/components/platform/edit-link-button";
import { RecordBalanceForm } from "@/components/cash/record-balance-form";
import { UploadStatementForm } from "@/components/cash/upload-statement-form";
import { StatementImportHistory } from "@/components/cash/statement-import-history";
import { BalanceHistory } from "@/components/cash/balance-history";
import { StaleBalanceBadge } from "@/components/cash/stale-balance-badge";
import {
  getCashAccount,
  getCashBalanceHistory,
  getCashStatementImports,
  listCashAccountCandidates,
} from "@/lib/data/cash-management";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { formatDate, formatMoney, formatOmr } from "@/lib/format";
import { BankAccountUsageBadge } from "@/components/bank/bank-account-usage-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CashAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireModuleAccess("CASH_MANAGEMENT");
  const [account, history, accountCandidates, importHistory] = await Promise.all([
    getCashAccount(id, ctx),
    getCashBalanceHistory(id, ctx),
    listCashAccountCandidates(ctx),
    getCashStatementImports(ctx, { bankAccountId: id, limit: 10 }),
  ]);

  if (!account) notFound();

  const canEdit = canWrite(ctx, "CASH_MANAGEMENT");

  return (
    <>
      <PlatformHeader title={account.accountName} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/cash">Back to Cash</Link>
          </Button>
          {canEdit ? <EditLinkButton href={"/cash/" + id + "/edit"} /> : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{account.accountName}</CardTitle>
                  <CardDescription>
                    {account.bankName} · {account.accountNumber}
                  </CardDescription>
                </div>
                <StaleBalanceBadge balanceAsOf={account.balanceAsOf} isStale={account.isStale} />
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Detail label="Entity" value={account.entityName ?? "—"} />
              <Detail label="Currency" value={account.currency} />
              <Detail
                label="Usage"
                value={
                  <div className="space-y-1">
                    <BankAccountUsageBadge includeInCashPosition={account.includeInCashPosition} />
                    <p className="text-xs text-muted-foreground">
                      {account.includeInCashPosition
                        ? "Included in cash position and net worth."
                        : "Excluded from cash position totals."}
                    </p>
                  </div>
                }
              />
              <Detail
                label="Current Balance"
                value={
                  account.currentBalance != null
                    ? formatMoney(account.currentBalance, account.currency)
                    : "—"
                }
              />
              <Detail
                label="OMR Equivalent"
                value={account.balanceOmr != null ? formatOmr(account.balanceOmr) : "—"}
              />
              <Detail label="Balance As Of" value={formatDate(account.balanceAsOf)} />
              <Detail label="IBAN" value={account.iban ?? "—"} />
              {account.notes ? (
                <div className="sm:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Account Notes</p>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{account.notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {canEdit ? (
            <div className="space-y-4">
              <UploadStatementForm
                accounts={accountCandidates}
                preferredAccountId={account.id}
                title="Import Statement"
                description="Upload a PDF statement for this account. Parsed balance and date can be reviewed before applying."
              />
              <RecordBalanceForm
                bankAccountId={account.id}
                currency={account.currency}
                currentBalance={account.currentBalance}
              />
            </div>
          ) : null}
        </div>

        {canEdit ? <StatementImportHistory imports={importHistory} /> : null}

        <BalanceHistory entries={history} currency={account.currency} />
      </main>
    </>
  );
}

function Detail({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{value ?? "—"}</div>
    </div>
  );
}
