"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordCashBalance } from "@/lib/actions/cash-management";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";

export function RecordBalanceForm({
  bankAccountId,
  bankAccountNumberId,
  accountLabel,
  currency,
  currentBalance,
}: {
  bankAccountId: string;
  bankAccountNumberId: string;
  accountLabel: string;
  currency: string;
  currentBalance?: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("bankAccountId", bankAccountId);
    formData.set("bankAccountNumberId", bankAccountNumberId);

    startTransition(async () => {
      try {
        await recordCashBalance(formData);
        setExpanded(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to record balance.");
      }
    });
  }

  if (!expanded) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setExpanded(true)}>
        Update Balance
      </Button>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Update Balance</CardTitle>
        <CardDescription>
          {accountLabel} · {currency}
          {currentBalance != null ? ` · Current: ${formatMoney(currentBalance, currency)}` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor={`balanceDate-${bankAccountNumberId}`}>Balance Date</Label>
            <Input
              id={`balanceDate-${bankAccountNumberId}`}
              name="balanceDate"
              type="date"
              defaultValue={today}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`balance-${bankAccountNumberId}`}>Balance ({currency})</Label>
            <Input
              id={`balance-${bankAccountNumberId}`}
              name="balance"
              type="number"
              step="0.001"
              required
              defaultValue={currentBalance ?? undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`notes-${bankAccountNumberId}`}>Notes (optional)</Label>
            <Textarea
              id={`notes-${bankAccountNumberId}`}
              name="notes"
              rows={2}
              placeholder="e.g. Statement received, reconciled with online banking"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save Balance"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setExpanded(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function RecordBalanceForms({
  bankAccountId,
  accounts,
}: {
  bankAccountId: string;
  accounts: Array<{
    id?: string;
    accountNumber: string;
    currency: string;
    label: string | null;
    currentBalance: number | null;
  }>;
}) {
  if (accounts.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Update Balance</CardTitle>
          <CardDescription>
            Add at least one registered account number before recording balances.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (accounts.length === 1) {
    const account = accounts[0]!;
    return (
      <RecordBalanceForm
        bankAccountId={bankAccountId}
        bankAccountNumberId={account.id!}
        accountLabel={account.label ? `${account.accountNumber} · ${account.label}` : account.accountNumber}
        currency={account.currency}
        currentBalance={account.currentBalance}
      />
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Update Balance</CardTitle>
        <CardDescription>
          Each registered account has its own balance. Choose the account to update.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {accounts.map((account) => (
          <div key={account.id ?? account.accountNumber} className="rounded-md border p-3">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium tabular-nums">{account.accountNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {account.currency}
                  {account.label ? ` · ${account.label}` : ""}
                </p>
              </div>
              <p className="text-sm tabular-nums">
                {account.currentBalance != null
                  ? formatMoney(account.currentBalance, account.currency)
                  : "No balance recorded"}
              </p>
            </div>
            {account.id ? (
              <RecordBalanceForm
                bankAccountId={bankAccountId}
                bankAccountNumberId={account.id}
                accountLabel={
                  account.label ? `${account.accountNumber} · ${account.label}` : account.accountNumber
                }
                currency={account.currency}
                currentBalance={account.currentBalance}
              />
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
