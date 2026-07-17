import type { BankAccountNumberDisplay } from "@/lib/bank/account-numbers";
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
}: {
  accounts: BankAccountNumberDisplay[];
  variant?: "table" | "compact";
}) {
  if (accounts.length === 0) {
    return <p className="text-sm text-muted-foreground">No account numbers registered.</p>;
  }

  if (variant === "compact") {
    return (
      <ul className="space-y-2">
        {accounts.map((account, index) => (
          <li key={`${account.accountNumber}-${index}`} className="text-sm leading-snug">
            <p className="font-medium tabular-nums">{account.accountNumber}</p>
            <p className="text-xs text-muted-foreground">
              {account.currency}
              {account.label ? ` · ${account.label}` : ""}
              {account.iban ? ` · IBAN ${account.iban}` : ""}
              {account.includeInTransferLetterSource ? " · Transfer source" : ""}
            </p>
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
          <TableHead>Label</TableHead>
          <TableHead>Transfer Source</TableHead>
          <TableHead>IBAN</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {accounts.map((account, index) => (
          <TableRow key={`${account.accountNumber}-${index}`}>
            <TableCell className="text-muted-foreground">{index + 1}</TableCell>
            <TableCell className="font-medium tabular-nums">{account.accountNumber}</TableCell>
            <TableCell>{account.currency}</TableCell>
            <TableCell>{account.label ?? "—"}</TableCell>
            <TableCell>{account.includeInTransferLetterSource ? "Yes" : "No"}</TableCell>
            <TableCell className="font-mono text-xs">{account.iban ?? "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
