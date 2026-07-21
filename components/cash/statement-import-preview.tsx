"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { applyCashStatementImport } from "@/lib/actions/cash-management";
import { accountLabel, confidenceLabel } from "@/lib/cash/statements/match-account";
import type { StatementAccountCandidate, StatementParsePreview } from "@/lib/cash/statements/types";
import { formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function confidenceVariant(
  confidence: StatementParsePreview["matchConfidence"],
): "default" | "secondary" | "outline" | "destructive" {
  switch (confidence) {
    case "high":
      return "default";
    case "medium":
      return "secondary";
    case "low":
      return "outline";
    default:
      return "destructive";
  }
}

function resolveRegisteredAccount(
  registeredAccounts: NonNullable<StatementAccountCandidate["accountNumbers"]>,
  bankAccountNumberId: string,
  preview: StatementParsePreview,
) {
  if (bankAccountNumberId) {
    return registeredAccounts.find((account) => account.id === bankAccountNumberId) ?? null;
  }

  return (
    registeredAccounts.find(
      (account) =>
        preview.accountNumber &&
        account.accountNumber.replace(/\s+/g, "") === preview.accountNumber.replace(/\s+/g, ""),
    ) ??
    registeredAccounts.find(
      (account) =>
        preview.currency &&
        account.currency.toUpperCase() === preview.currency.toUpperCase(),
    ) ??
    registeredAccounts[0] ??
    null
  );
}

export function StatementImportPreview({
  preview,
  accounts,
  onApplied,
}: {
  preview: StatementParsePreview;
  accounts: StatementAccountCandidate[];
  onApplied?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [bankAccountId, setBankAccountId] = useState(preview.matchedAccountId ?? "");
  const [bankAccountNumberId, setBankAccountNumberId] = useState("");
  const [balance, setBalance] = useState(
    preview.balance != null ? preview.balance.toFixed(3) : "",
  );
  const [balanceDate, setBalanceDate] = useState(preview.balanceDate ?? "");

  const selectedAccount = accounts.find((account) => account.id === bankAccountId);
  const registeredAccounts = selectedAccount?.accountNumbers ?? [];
  const selectedRegisteredAccount = resolveRegisteredAccount(
    registeredAccounts,
    bankAccountNumberId,
    preview,
  );
  const currency =
    selectedRegisteredAccount?.currency ??
    selectedAccount?.currency ??
    preview.currency ??
    "OMR";

  if (preview.status === "failed") {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
        <p className="font-medium">{preview.fileName}</p>
        <p className="text-destructive">{preview.error ?? "Failed to parse statement."}</p>
        {preview.warnings.map((warning) => (
          <p key={warning} className="text-muted-foreground">
            {warning}
          </p>
        ))}
      </div>
    );
  }

  if (applied) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
        <p className="font-medium">{preview.fileName}</p>
        <p>Balance applied successfully.</p>
      </div>
    );
  }

  function handleApply() {
    setError(null);

    if (!bankAccountId) {
      setError("Select the bank account to update.");
      return;
    }
    if (registeredAccounts.length > 0 && !selectedRegisteredAccount) {
      setError("Select the registered account to update.");
      return;
    }
    if (!balance.trim()) {
      setError("Balance is required.");
      return;
    }
    if (!balanceDate) {
      setError("Balance date is required.");
      return;
    }

    startTransition(async () => {
      try {
        await applyCashStatementImport({
          importId: preview.importId,
          bankAccountId,
          bankAccountNumberId: selectedRegisteredAccount?.id,
          balance,
          balanceDate,
        });
        setApplied(true);
        onApplied?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to apply statement.");
      }
    });
  }

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{preview.fileName}</p>
          {preview.bankName ? (
            <p className="text-sm text-muted-foreground">{preview.bankName}</p>
          ) : null}
        </div>
        <Badge variant={confidenceVariant(preview.matchConfidence)}>
          {confidenceLabel(preview.matchConfidence)}
        </Badge>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        {preview.accountNumber ? (
          <div>
            <dt className="text-muted-foreground">Account number</dt>
            <dd>{preview.accountNumber}</dd>
          </div>
        ) : null}
        {preview.iban ? (
          <div>
            <dt className="text-muted-foreground">IBAN</dt>
            <dd className="break-all">{preview.iban}</dd>
          </div>
        ) : null}
        {preview.matchReason ? (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Match</dt>
            <dd>{preview.matchReason}</dd>
          </div>
        ) : null}
      </dl>

      {preview.warnings.length > 0 ? (
        <ul className="space-y-1 text-sm text-amber-700">
          {preview.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Bank account</Label>
          <Select
            value={bankAccountId}
            onValueChange={(value) => {
              setBankAccountId(value);
              setBankAccountNumberId("");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {accountLabel(account)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {registeredAccounts.length > 1 ? (
          <div className="space-y-2 sm:col-span-2">
            <Label>Registered account</Label>
            <Select
              value={bankAccountNumberId || selectedRegisteredAccount?.id || ""}
              onValueChange={setBankAccountNumberId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select registered account" />
              </SelectTrigger>
              <SelectContent>
                {registeredAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.accountNumber} ({account.currency})
                    {account.label ? ` · ${account.label}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor={`balance-${preview.importId}`}>Closing balance ({currency})</Label>
          <Input
            id={`balance-${preview.importId}`}
            type="number"
            step="0.001"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
          />
          {preview.balance != null ? (
            <p className="text-xs text-muted-foreground">
              Extracted: {formatMoney(preview.balance, currency)}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`balance-date-${preview.importId}`}>Statement date</Label>
          <Input
            id={`balance-date-${preview.importId}`}
            type="date"
            value={balanceDate}
            onChange={(e) => setBalanceDate(e.target.value)}
          />
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={handleApply} disabled={pending}>
          {pending ? "Applying..." : "Confirm & Apply Balance"}
        </Button>
        {preview.matchConfidence === "none" || !preview.matchedAccountId ? (
          <Button type="button" variant="outline" asChild>
            <Link href={`/cash/new?importId=${preview.importId}`}>Create account from statement</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
