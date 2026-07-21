import type { BankAccountNumberDisplay } from "@/lib/bank/account-numbers";
import { StaleBalanceBadge } from "@/components/cash/stale-balance-badge";
import { formatDate, formatMoney } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function BankAccountNumbersList({
  accounts,
  variant = "table",
  showBalances = false,
}: {
  accounts: BankAccountNumberDisplay[];
  variant?: "table" | "compact";
  showBalances?: boolean;
}) {
  if (accounts.length === 0) {
    return <p className="text-sm text-muted-foreground">No account numbers registered.</p>;
  }

  if (variant === "compact") {
    return (
      <ul className="space-y-3">
        {accounts.map((account, index) => (
          <li
            key={account.id ?? `${account.accountNumber}-${index}`}
            className="rounded-md border p-3 text-sm leading-snug"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium tabular-nums">{account.accountNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {account.currency}
                  {account.label ? ` · ${account.label}` : ""}
                  {account.iban ? ` · IBAN ${account.iban}` : ""}
                  {account.includeInTransferLetterSource ? " · Transfer source" : ""}
                </p>
              </div>
              {showBalances ? (
                <div className="text-right">
                  <p className="font-medium tabular-nums">
                    {account.currentBalance != null
                      ? formatMoney(account.currentBalance, account.currency)
                      : "—"}
                  </p>
                  <div className="mt-1 flex items-center justify-end gap-2">
                    <p className="text-xs text-muted-foreground">
                      {account.balanceAsOf ? `As of ${formatDate(account.balanceAsOf)}` : "No balance recorded"}
                    </p>
                    <StaleBalanceBadge balanceAsOf={account.balanceAsOf} isStale={account.isStale} />
                  </div>
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[48px]">#</TableHead>
          <TableHead>Account Number</TableHead>
          <TableHead>Currency</TableHead>
          {showBalances ? <TableHead className="text-right">Balance</TableHead> : null}
          {showBalances ? <TableHead>As of</TableHead> : null}
          <TableHead>Label</TableHead>
          <TableHead>Transfer Source</TableHead>
          <TableHead>IBAN</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {accounts.map((account, index) => (
          <TableRow key={account.id ?? `${account.accountNumber}-${index}`}>
            <TableCell className="text-muted-foreground">{index + 1}</TableCell>
            <TableCell className="font-medium tabular-nums">{account.accountNumber}</TableCell>
            <TableCell>{account.currency}</TableCell>
            {showBalances ? (
              <TableCell className="text-right tabular-nums">
                {account.currentBalance != null
                  ? formatMoney(account.currentBalance, account.currency)
                  : "—"}
              </TableCell>
            ) : null}
            {showBalances ? (
              <TableCell>
                <div className="flex items-center gap-2">
                  {formatDate(account.balanceAsOf)}
                  <StaleBalanceBadge balanceAsOf={account.balanceAsOf} isStale={account.isStale} />
                </div>
              </TableCell>
            ) : null}
            <TableCell>{account.label ?? "—"}</TableCell>
            <TableCell>{account.includeInTransferLetterSource ? "Yes" : "No"}</TableCell>
            <TableCell className="font-mono text-xs">{account.iban ?? "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
