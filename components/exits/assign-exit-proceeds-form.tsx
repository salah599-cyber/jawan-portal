"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  assignExitProceedsToBankAccount,
  listAssignableBankAccountsForExit,
} from "@/lib/actions/asset-exits";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BankOption = Awaited<ReturnType<typeof listAssignableBankAccountsForExit>>[number];

export function AssignExitProceedsForm({
  exitId,
  proceeds,
  currency,
  compact = false,
}: {
  exitId: string;
  proceeds: string;
  currency: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<BankOption[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [bankAccountId, setBankAccountId] = useState("");

  useEffect(() => {
    let active = true;
    setLoadingAccounts(true);
    listAssignableBankAccountsForExit(exitId)
      .then((rows) => {
        if (active) setAccounts(rows);
      })
      .catch(() => {
        if (active) setError("Could not load bank accounts.");
      })
      .finally(() => {
        if (active) setLoadingAccounts(false);
      });
    return () => {
      active = false;
    };
  }, [exitId]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData();
    formData.set("exitId", exitId);
    formData.set("bankAccountId", bankAccountId);

    startTransition(async () => {
      try {
        await assignExitProceedsToBankAccount(formData);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to assign proceeds.");
      }
    });
  }

  if (loadingAccounts) {
    return <p className="text-sm text-muted-foreground">Loading bank accounts…</p>;
  }

  if (accounts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No eligible bank accounts in {currency}. Add one under Cash Management first.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? "flex flex-wrap items-end gap-3" : "space-y-3"}>
      <div className={compact ? "min-w-[220px] flex-1 space-y-2" : "space-y-2"}>
        <Label>Deposit to bank account</Label>
        <Select value={bankAccountId} onValueChange={setBankAccountId} required>
          <SelectTrigger>
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.bankName} — {account.accountName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {!compact ? (
        <p className="text-sm text-muted-foreground">
          {formatMoney(proceeds, currency)} will move from the suspense account to the selected bank
          account.
        </p>
      ) : null}
      {error ? <p className="w-full text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size={compact ? "sm" : "default"} disabled={pending || !bankAccountId}>
        {pending ? "Assigning…" : "Confirm deposit"}
      </Button>
    </form>
  );
}
