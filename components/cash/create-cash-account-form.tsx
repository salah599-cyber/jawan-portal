"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCashAccount } from "@/lib/actions/cash-management";
import type { BankAccountNumberInput } from "@/lib/bank/account-numbers";
import { BankAccountNumbersFields } from "@/components/bank/bank-account-numbers-fields";
import type { StatementAccountPrefill } from "@/lib/cash/statements/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";
import { BankAccountUsageField } from "@/components/bank/bank-account-usage-field";
import { formatMoney } from "@/lib/format";

export function CreateCashAccountForm({
  entities,
  prefill,
}: {
  entities: EntityOption[];
  prefill?: StatementAccountPrefill | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [entityId, setEntityId] = useState<string>("none");
  const [includeInCashPosition, setIncludeInCashPosition] = useState(true);
  const [accounts, setAccounts] = useState<BankAccountNumberInput[]>([
    {
      accountNumber: prefill?.accountNumber ?? "",
      currency: prefill?.currency ?? "OMR",
      iban: prefill?.iban ?? "",
      label: "",
      includeInTransferLetterSource: false,
    },
  ]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const account = await createCashAccount({
          accountName: String(form.get("accountName") ?? ""),
          bankName: String(form.get("bankName") ?? ""),
          accounts,
          swiftCode: String(form.get("swiftCode") ?? ""),
          sortCode: String(form.get("sortCode") ?? ""),
          entityId: entityId === "none" ? undefined : entityId,
          notes: String(form.get("notes") ?? ""),
          includeInCashPosition,
          statementImportId: prefill?.importId,
        });
        router.push("/cash/" + account.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create account.");
      }
    });
  }

  const primaryCurrency = accounts[0]?.currency ?? prefill?.currency ?? "OMR";

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Bank Account</CardTitle>
        {prefill ? (
          <CardDescription>
            Pre-filled from statement <span className="font-medium">{prefill.fileName}</span>
            {prefill.parserId ? ` · parsed with ${prefill.parserId}` : ""}.
            {prefill.balance != null && prefill.balanceDate
              ? ` Closing balance of ${formatMoney(prefill.balance, primaryCurrency)} as of ${prefill.balanceDate} will be applied after saving.`
              : " Review the details below before saving."}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="accountName">Account Name</Label>
            <Input
              id="accountName"
              name="accountName"
              required
              defaultValue={prefill?.accountName ?? ""}
              placeholder="e.g. Operating Account"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <Input
              id="bankName"
              name="bankName"
              required
              defaultValue={prefill?.bankName ?? ""}
              placeholder="e.g. Bank Muscat"
            />
          </div>
          <BankAccountNumbersFields accounts={accounts} onChange={setAccounts} />
          <div className="space-y-2">
            <Label htmlFor="swiftCode">SWIFT Code</Label>
            <Input id="swiftCode" name="swiftCode" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sortCode">Sort Code</Label>
            <Input id="sortCode" name="sortCode" />
          </div>
          <div className="space-y-2">
            <Label>Entity (optional)</Label>
            <EntitySelect entities={entities} value={entityId} onValueChange={setEntityId} allowNone />
          </div>
          <BankAccountUsageField
            value={includeInCashPosition}
            onChange={setIncludeInCashPosition}
          />
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Account Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={
                prefill ? `Created from imported statement: ${prefill.fileName}` : undefined
              }
              placeholder="Purpose of account, signatories, etc."
            />
          </div>
          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending
                ? prefill?.balance != null
                  ? "Creating & applying balance..."
                  : "Saving..."
                : prefill?.balance != null
                  ? "Create Account & Apply Balance"
                  : "Save Account"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
