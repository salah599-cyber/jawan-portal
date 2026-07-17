import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { EditLinkButton } from "@/components/platform/edit-link-button";
import { BankAccountNumbersList } from "@/components/bank/bank-account-numbers-list";
import { resolveBankAccountNumberRows } from "@/lib/bank/account-numbers";
import { getBankAccount, deleteBankAccount } from "@/lib/actions/bank-accounts";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { CHEQUE_DIRECTION_LABELS, CHEQUE_STATUS_LABELS } from "@/lib/labels";
import { BankAccountUsageBadge } from "@/components/bank/bank-account-usage-badge";
import { formatMoney, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function BankAccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireModuleAccess("ASSETS");
  const account = await getBankAccount(id);
  if (!account) notFound();

  const showActions = canWrite(ctx, "ASSETS");
  const registeredAccounts = resolveBankAccountNumberRows(account.accountNumbers, account);

  return (
    <>
      <PlatformHeader title={account.accountName} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/assets/bank-details">Back to Bank Details</Link>
          </Button>
          {showActions ? (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href={"/transfer-letters/new?sourceBankAccountId=" + account.id}>
                  Create Transfer Letter
                </Link>
              </Button>
              <EditLinkButton href={"/assets/bank-details/" + account.id + "/edit"} />
              <DeleteEntryButton
                itemId={account.id}
                itemLabel={account.accountName}
                deleteAction={deleteBankAccount}
                redirectTo="/assets/bank-details"
                title="Delete bank account?"
                description="This will permanently delete this bank account record."
              />
            </>
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Registry Details</CardTitle>
            <CardDescription>
              {account.bankName}
              {registeredAccounts.length > 0
                ? ` · ${registeredAccounts.length} registered account${registeredAccounts.length === 1 ? "" : "s"}`
                : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Detail label="Account Name" value={account.accountName} />
            <Detail label="Bank" value={account.bankName} />
            <Detail
              label="Usage"
              value={
                <div className="space-y-1">
                  <BankAccountUsageBadge includeInCashPosition={account.includeInCashPosition} />
                  <p className="text-xs text-muted-foreground">
                    {account.includeInCashPosition
                      ? "This account balance is included in cash position and net worth."
                      : "This account is stored for reference only and is excluded from cash position."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {account.includeInTransferLetterSource
                      ? "This account is available in the transfer letter source account dropdown."
                      : "This account is excluded from the transfer letter source dropdown but can still be used as a beneficiary."}
                  </p>
                </div>
              }
            />
            <Detail label="Entity" value={account.entity?.name} />
            <Detail label="SWIFT / BIC" value={account.swiftCode} />
            <Detail label="Sort Code" value={account.sortCode} />
            <Detail label="Created" value={formatDate(account.createdAt)} />
            <Detail label="Last Updated" value={formatDate(account.updatedAt)} />
            {account.notes ? (
              <div className="sm:col-span-2">
                <Detail label="Notes" value={account.notes} />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registered Accounts</CardTitle>
            <CardDescription>
              Each line is a separate account at this bank. Account number, currency, and IBAN are listed individually.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BankAccountNumbersList accounts={registeredAccounts} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Linked Cheques</CardTitle>
            <CardDescription>
              {account.cheques.length} cheque{account.cheques.length === 1 ? "" : "s"} registered against this account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {account.cheques.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cheques linked to this account yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cheque #</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Payee / Payer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {account.cheques.map((cheque) => (
                    <TableRow key={cheque.id}>
                      <TableCell className="font-medium">
                        <Link href={"/cheques/" + cheque.id} className="hover:underline">
                          {cheque.chequeNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{CHEQUE_DIRECTION_LABELS[cheque.direction] ?? cheque.direction}</TableCell>
                      <TableCell>{cheque.payee}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{CHEQUE_STATUS_LABELS[cheque.status] ?? cheque.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatMoney(cheque.amount, cheque.currency)}</TableCell>
                      <TableCell>{formatDate(cheque.issueDate)}</TableCell>
                      <TableCell>{formatDate(cheque.dueDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode | string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{value ?? "—"}</div>
    </div>
  );
}
