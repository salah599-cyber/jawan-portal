"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCashAccount } from "@/lib/actions/cash-management";
import { CASH_CURRENCIES } from "@/lib/cash/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";
import { BankAccountUsageField } from "@/components/bank/bank-account-usage-field";

export function CreateCashAccountForm({ entities }: { entities: EntityOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState("OMR");
  const [entityId, setEntityId] = useState<string>("none");
  const [includeInCashPosition, setIncludeInCashPosition] = useState(true);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const account = await createCashAccount({
          accountName: String(form.get("accountName") ?? ""),
          bankName: String(form.get("bankName") ?? ""),
          accountNumber: String(form.get("accountNumber") ?? ""),
          iban: String(form.get("iban") ?? ""),
          swiftCode: String(form.get("swiftCode") ?? ""),
          sortCode: String(form.get("sortCode") ?? ""),
          currency,
          entityId: entityId === "none" ? undefined : entityId,
          notes: String(form.get("notes") ?? ""),
          includeInCashPosition,
        });
        router.push("/cash/" + account.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create account.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Bank Account</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="accountName">Account Name</Label>
            <Input id="accountName" name="accountName" required placeholder="e.g. Operating Account" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <Input id="bankName" name="bankName" required placeholder="e.g. Bank Muscat" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account Number</Label>
            <Input id="accountNumber" name="accountNumber" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="iban">IBAN</Label>
            <Input id="iban" name="iban" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="swiftCode">SWIFT Code</Label>
            <Input id="swiftCode" name="swiftCode" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sortCode">Sort Code</Label>
            <Input id="sortCode" name="sortCode" />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CASH_CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Textarea id="notes" name="notes" rows={3} placeholder="Purpose of account, signatories, etc." />
          </div>
          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save Account"}
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
