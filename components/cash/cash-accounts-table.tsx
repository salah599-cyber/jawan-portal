import Link from "next/link";
import { StaleBalanceBadge } from "@/components/cash/stale-balance-badge";
import { BankAccountUsageBadge } from "@/components/bank/bank-account-usage-badge";
import { formatDate, formatMoney, formatOmr } from "@/lib/format";
import type { CashAccountRow } from "@/lib/data/cash-management";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function CashAccountsTable({
  accounts,
  showActions = false,
}: {
  accounts: CashAccountRow[];
  showActions?: boolean;
}) {
  if (accounts.length === 0) {
    return <p className="text-sm text-muted-foreground">No bank accounts yet. Add your first account to get started.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Account</TableHead>
          <TableHead>Bank</TableHead>
          <TableHead>Entity</TableHead>
          <TableHead>Usage</TableHead>
          <TableHead className="text-right">Balance</TableHead>
          <TableHead className="text-right">OMR Equivalent</TableHead>
          <TableHead>As of</TableHead>
          <TableHead>Status</TableHead>
          {showActions ? <TableHead className="w-[80px]" /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {accounts.map((account) => (
          <TableRow key={account.id} className={account.isStale ? "bg-amber-50/40 dark:bg-amber-950/10" : undefined}>
            <TableCell className="font-medium">
              <Link href={"/cash/" + account.id} className="hover:underline">
                {account.accountName}
              </Link>
              <p className="text-xs text-muted-foreground">{account.accountNumber}</p>
            </TableCell>
            <TableCell>{account.bankName}</TableCell>
            <TableCell>{account.entityName ?? "—"}</TableCell>
            <TableCell>
              <BankAccountUsageBadge includeInCashPosition={account.includeInCashPosition} />
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {account.currentBalance != null
                ? formatMoney(account.currentBalance, account.currency)
                : "—"}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {account.balanceOmr != null ? formatOmr(account.balanceOmr) : "—"}
            </TableCell>
            <TableCell>{formatDate(account.balanceAsOf)}</TableCell>
            <TableCell>
              <StaleBalanceBadge balanceAsOf={account.balanceAsOf} isStale={account.isStale} />
            </TableCell>
            {showActions ? (
              <TableCell>
                <Link href={"/cash/" + account.id} className="text-sm text-primary hover:underline">
                  Update
                </Link>
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
