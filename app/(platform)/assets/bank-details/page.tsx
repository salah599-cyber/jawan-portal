import Link from "next/link";
import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { RowActions } from "@/components/platform/row-actions";
import { BankAccountNumbersList } from "@/components/bank/bank-account-numbers-list";
import { resolveBankAccountNumberRows } from "@/lib/bank/account-numbers";
import { listBankAccounts, deleteBankAccount } from "@/lib/actions/bank-accounts";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { formatDate } from "@/lib/format";
import { BankAccountUsageBadge } from "@/components/bank/bank-account-usage-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function BankDetailsPage() {
  const ctx = await requireModuleAccess("ASSETS");
  const accounts = await listBankAccounts();
  const showAdd = canWrite(ctx, "ASSETS");

  return (
    <>
      <PlatformHeader title="Bank Details" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Bank Details</CardTitle>
              <CardDescription>Family bank account registry.</CardDescription>
            </div>
            {showAdd ? (
              <AddLinkButton href="/assets/bank-details/new" label="Add Bank Account" />
            ) : null}
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bank accounts registered yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Registered Accounts</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Updated</TableHead>
                    {showAdd ? <TableHead className="w-[60px]">Actions</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium align-top">
                        <Link href={"/assets/bank-details/" + account.id} className="hover:underline">
                          {account.accountName}
                        </Link>
                      </TableCell>
                      <TableCell className="align-top">{account.bankName}</TableCell>
                      <TableCell className="align-top min-w-[220px]">
                        <BankAccountNumbersList
                          accounts={resolveBankAccountNumberRows(account.accountNumbers, account)}
                          variant="compact"
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <BankAccountUsageBadge includeInCashPosition={account.includeInCashPosition} />
                      </TableCell>
                      <TableCell className="align-top">{account.entity?.name ?? "—"}</TableCell>
                      <TableCell className="align-top">{formatDate(account.updatedAt)}</TableCell>
                      {showAdd ? (
                        <TableCell className="align-top">
                          <RowActions
                            editHref={"/assets/bank-details/" + account.id + "/edit"}
                            itemId={account.id}
                            itemLabel={account.accountName}
                            deleteAction={deleteBankAccount}
                          />
                        </TableCell>
                      ) : null}
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
