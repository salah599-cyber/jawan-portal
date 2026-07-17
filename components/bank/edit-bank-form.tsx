"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBankAccount } from "@/lib/actions/bank-accounts";
import { accountNumbersFromLegacy, type BankAccountNumberInput } from "@/lib/bank/account-numbers";
import { BankAccountNumbersFields } from "@/components/bank/bank-account-numbers-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";
import { BankAccountUsageField } from "@/components/bank/bank-account-usage-field";

type BankRecord = {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  iban: string | null;
  swiftCode: string | null;
  sortCode: string | null;
  currency: string;
  entityId: string | null;
  notes: string | null;
  includeInCashPosition: boolean;
  accountNumbers?: Array<{
    accountNumber: string;
    currency: string;
    iban: string | null;
    label: string | null;
    includeInTransferLetterSource?: boolean;
  }>;
};

export function EditBankForm({ account, entities }: { account: BankRecord; entities: EntityOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [entityId, setEntityId] = useState(account.entityId ?? "none");
  const [includeInCashPosition, setIncludeInCashPosition] = useState(account.includeInCashPosition);
  const [accounts, setAccounts] = useState<BankAccountNumberInput[]>(
    accountNumbersFromLegacy(account.accountNumber, account.currency, account.accountNumbers, account.iban),
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updateBankAccount(account.id, {
          accountName: String(form.get("accountName") ?? ""),
          bankName: String(form.get("bankName") ?? ""),
          accounts,
          swiftCode: String(form.get("swiftCode") ?? ""),
          sortCode: String(form.get("sortCode") ?? ""),
          entityId: entityId === "none" ? undefined : entityId,
          notes: String(form.get("notes") ?? ""),
          includeInCashPosition,
        });
        router.push("/assets/bank-details/" + account.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update bank account.");
      }
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Edit Bank Account</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="accountName">Account Name</Label><Input id="accountName" name="accountName" required defaultValue={account.accountName} /></div>
          <div className="space-y-2"><Label htmlFor="bankName">Bank Name</Label><Input id="bankName" name="bankName" required defaultValue={account.bankName} /></div>
          <BankAccountNumbersFields accounts={accounts} onChange={setAccounts} />
          <div className="space-y-2"><Label htmlFor="swiftCode">SWIFT Code</Label><Input id="swiftCode" name="swiftCode" defaultValue={account.swiftCode ?? ""} /></div>
          <div className="space-y-2"><Label htmlFor="sortCode">Sort Code</Label><Input id="sortCode" name="sortCode" defaultValue={account.sortCode ?? ""} /></div>
          <div className="space-y-2">
            <Label>Entity (optional)</Label>
            <EntitySelect entities={entities} value={entityId} onValueChange={setEntityId} allowNone />
          </div>
          <BankAccountUsageField
            value={includeInCashPosition}
            onChange={setIncludeInCashPosition}
          />
          <div className="space-y-2 md:col-span-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" rows={3} defaultValue={account.notes ?? ""} /></div>
          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save Changes"}</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
