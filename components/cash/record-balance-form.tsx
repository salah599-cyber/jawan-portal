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
  currency,
  currentBalance,
}: {
  bankAccountId: string;
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
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Update Balance</CardTitle>
          <CardDescription>
            Record the current balance as of a specific date. This becomes the account&apos;s latest position.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={() => setExpanded(true)}>
            Update Balance
          </Button>
        </CardContent>
      </Card>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update Balance</CardTitle>
        <CardDescription>
          {currentBalance != null
            ? `Current: ${formatMoney(currentBalance, currency)}`
            : "No balance recorded yet."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="balanceDate">Balance Date</Label>
            <Input id="balanceDate" name="balanceDate" type="date" defaultValue={today} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="balance">Balance ({currency})</Label>
            <Input
              id="balance"
              name="balance"
              type="number"
              step="0.001"
              required
              defaultValue={currentBalance ?? undefined}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="e.g. Statement received, reconciled with online banking"
            />
          </div>
          {error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
          <div className="flex gap-2 sm:col-span-2">
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
