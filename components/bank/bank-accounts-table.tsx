import Link from "next/link";
import { RowActions } from "@/components/platform/row-actions";
import { BankAccountNumbersList } from "@/components/bank/bank-account-numbers-list";
import { BankAccountUsageBadge } from "@/components/bank/bank-account-usage-badge";
import { deleteBankAccount, type listBankAccounts } from "@/lib/actions/bank-accounts";
import { resolveBankAccountNumberRows } from "@/lib/bank/account-numbers";
import { BANK_ACCOUNT_REGION_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type BankAccount = Awaited<ReturnType<typeof listBankAccounts>>[number];

export function BankAccountsTable({
  accounts,
  showActions,
  showRegion = false,
}: {
  accounts: BankAccount[];
  showActions: boolean;
  showRegion?: boolean;
}) {
  if (accounts.length === 0) {
    return <p className="text-sm text-muted-foreground">No bank accounts in this section yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Account Name</TableHead>
          <TableHead>Bank</TableHead>
          <TableHead>Registered Accounts</TableHead>
          {showRegion ? <TableHead>Region</TableHead> : null}
          <TableHead>Usage</TableHead>
          <TableHead>Entity</TableHead>
          <TableHead>Updated</TableHead>
          {showActions ? <TableHead className="w-[60px]">Actions</TableHead> : null}
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
            {showRegion ? (
              <TableCell className="align-top">
                <Badge variant={account.region === "USA" ? "default" : "outline"}>
                  {BANK_ACCOUNT_REGION_LABELS[account.region] ?? account.region}
                </Badge>
              </TableCell>
            ) : null}
            <TableCell className="align-top">
              <BankAccountUsageBadge includeInCashPosition={account.includeInCashPosition} />
            </TableCell>
            <TableCell className="align-top">{account.entity?.name ?? "—"}</TableCell>
            <TableCell className="align-top">{formatDate(account.updatedAt)}</TableCell>
            {showActions ? (
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
  );
}
