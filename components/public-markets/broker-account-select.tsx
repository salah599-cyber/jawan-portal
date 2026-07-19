"use client";

import { useEffect, useState, useTransition } from "react";
import { listPublicBrokerAccounts } from "@/lib/actions/public-markets";
import type { PublicBrokerAccountRow } from "@/lib/public-markets/broker-accounts";
import { Label } from "@/components/ui/label";

function formatBrokerAccountLabel(account: PublicBrokerAccountRow) {
  const parts = [account.label || account.broker];
  if (account.accountNumber) parts.push(account.accountNumber);
  parts.push(account.isManaged ? "Managed" : "Reference");
  return parts.join(" · ");
}

export function BrokerAccountSelect({
  entityId,
  value,
  onValueChange,
  onAccountSelected,
}: {
  entityId: string;
  value: string;
  onValueChange: (value: string) => void;
  onAccountSelected?: (account: PublicBrokerAccountRow | null) => void;
}) {
  const [accounts, setAccounts] = useState<PublicBrokerAccountRow[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!entityId) {
      setAccounts([]);
      return;
    }

    startTransition(async () => {
      const rows = await listPublicBrokerAccounts(entityId);
      setAccounts(rows);
    });
  }, [entityId]);

  useEffect(() => {
    const account = accounts.find((row) => row.id === value) ?? null;
    onAccountSelected?.(account);
  }, [accounts, value, onAccountSelected]);

  return (
    <div className="space-y-2">
      <Label htmlFor="broker-account">Broker account</Label>
      <select
        id="broker-account"
        name="brokerAccountId"
        required
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        disabled={!entityId || pending}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">{pending ? "Loading accounts..." : "Select broker account"}</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {formatBrokerAccountLabel(account)}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">
        Re-importing replaces holdings for this account and portfolio type only.
      </p>
    </div>
  );
}
