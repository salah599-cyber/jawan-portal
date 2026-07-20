import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { EditLinkButton } from "@/components/platform/edit-link-button";
import { BankAccountNumbersList } from "@/components/bank/bank-account-numbers-list";
import { resolveBankAccountNumberRows } from "@/lib/bank/account-numbers";
import { getBankAccount, deleteBankAccount } from "@/lib/actions/bank-accounts";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { CHEQUE_DIRECTION_LABELS, CHEQUE_STATUS_LABELS, BANK_ACCOUNT_REGION_LABELS } from "@/lib/labels";
import { isUsaBankRegion } from "@/lib/bank/region";
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
  const isUsa = isUsaBankRegion(account.region);

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
              {" · "}
              {BANK_ACCOUNT_REGION_LABELS[account.region] ?? account.region}
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
                    {registeredAccounts.some((row) => row.includeInTransferLetterSource)
                      ? `${registeredAccounts.filter((row) => row.includeInTransferLetterSource).length} of ${registeredAccounts.length} registered account${registeredAccounts.length === 1 ? "" : "s"} available as transfer letter source accounts.`
                      : "No registered account numbers are enabled for the transfer letter source dropdown. Edit this bank account to enable specific accounts."}
                  </p>
                </div>
              }
            />
            <Detail label="Entity" value={account.entity?.name} />
            <Detail label="SWIFT / BIC" value={account.swiftCode} />
            {isUsa ? (
              <Detail label="Routing Number (ABA)" value={account.routingNumber} />
            ) : (
              <Detail label="Sort Code" value={account.sortCode} />
            )}
            <Detail label="Created" value={formatDate(account.createdAt)} />
            <Detail label="Last Updated" value={formatDate(account.updatedAt)} />
            {account.notes ? (
              <div className="sm:col-span-2">
                <Detail label="Notes" value={account.notes} />
              </div>
            ) : null}
          </CardContent>
        </Card>

        {isUsa ? (
          <Card>
            <CardHeader>
              <CardTitle>Correspondent Bank</CardTitle>
              <CardDescription>
                Intermediary bank details for international USD wires to this account.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Detail label="Correspondent Bank Name" value={account.correspondentBankName} />
              <Detail label="Correspondent SWIFT / BIC" value={account.correspondentSwiftCode} />
              <Detail label="Correspondent Routing Number (ABA)" value={account.correspondentRoutingNumber} />
              {account.correspondentFfcInstructions ? (
                <div className="sm:col-span-2">
                  <Detail label="FFC Instructions" value={account.correspondentFfcInstructions} />
                </div>
              ) : (
                <Detail label="FFC Instructions" value={null} />
              )}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Registered Accounts</CardTitle>
            <CardDescription>
              {isUsa
                ? "Each line is a separate US account number at this bank."
                : "Each line is a separate account at this bank. Account number, currency, and IBAN are listed individually."}
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
