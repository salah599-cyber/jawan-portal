"use client";

import { useEffect, useState } from "react";
import { listPublicBrokerAccounts } from "@/lib/actions/public-markets";
import type { PublicBrokerAccountRow } from "@/lib/public-markets/broker-accounts";
import { Label } from "@/components/ui/label";

const EMPTY_BROKER_ACCOUNTS: PublicBrokerAccountRow[] = [];

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
  brokerAccounts = EMPTY_BROKER_ACCOUNTS,
}: {
  entityId: string;
  value: string;
  onValueChange: (value: string) => void;
  onAccountSelected?: (account: PublicBrokerAccountRow | null) => void;
  brokerAccounts?: PublicBrokerAccountRow[];
}) {
  const [seedEntityId] = useState(entityId);
  const [remote, setRemote] = useState<{
    entityId: string;
    accounts: PublicBrokerAccountRow[];
  } | null>(null);

  const seededAccounts = entityId
    ? brokerAccounts.filter((account) => account.entityId === entityId)
    : EMPTY_BROKER_ACCOUNTS;
  const seededCoversEntity = Boolean(entityId) && (entityId === seedEntityId || seededAccounts.length > 0);
  const pending = Boolean(entityId) && !seededCoversEntity && remote?.entityId !== entityId;

  useEffect(() => {
    if (!entityId || seededCoversEntity || remote?.entityId === entityId) return;

    let cancelled = false;

    void listPublicBrokerAccounts(entityId)
      .then((rows) => {
        if (!cancelled) setRemote({ entityId, accounts: rows });
      })
      .catch(() => {
        if (!cancelled) setRemote({ entityId, accounts: EMPTY_BROKER_ACCOUNTS });
      });

    return () => {
      cancelled = true;
    };
  }, [entityId, seededCoversEntity, remote?.entityId]);

  const visibleAccounts = !entityId
    ? EMPTY_BROKER_ACCOUNTS
    : seededCoversEntity
      ? seededAccounts
      : remote?.entityId === entityId
        ? remote.accounts
        : EMPTY_BROKER_ACCOUNTS;

  return (
    <div className="space-y-2">
      <Label htmlFor="broker-account">Broker account</Label>
      <select
        id="broker-account"
        name="brokerAccountId"
        required
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;
          onValueChange(nextValue);
          const account = visibleAccounts.find((row) => row.id === nextValue) ?? null;
          onAccountSelected?.(account);
        }}
        disabled={!entityId || pending}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">{pending ? "Loading accounts..." : "Select broker account"}</option>
        {visibleAccounts.map((account) => (
          <option key={account.id} value={account.id}>
            {formatBrokerAccountLabel(account)}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">
        Re-importing replaces holdings for this account and portfolio type only.
      </p>
      {!pending && visibleAccounts.length === 0 ? (
        <p className="text-sm text-amber-700">
          No broker accounts for this entity yet. Use the Broker Accounts card above to register
          your brokerage (e.g. Schwab, UBS) before importing statements.
        </p>
      ) : null}
    </div>
  );
}
