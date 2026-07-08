"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordLoanPayment } from "@/lib/actions/loan-payments";
import { LOAN_PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ALLOWED_UPLOAD_ACCEPT } from "@/lib/upload-limits";

export function RecordLoanPaymentForm({
  liabilityId,
  currency,
  outstandingBalance,
  defaultPaymentAmount,
}: {
  liabilityId: string;
  currency: string;
  outstandingBalance: string;
  defaultPaymentAmount?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("liabilityId", liabilityId);
    formData.set("paymentMethod", paymentMethod);
    formData.set("currency", currency);

    startTransition(async () => {
      try {
        await recordLoanPayment(formData);
        setExpanded(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to record payment.");
      }
    });
  }

  if (!expanded) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Record Payment</CardTitle>
          <CardDescription>
            Log a repayment and update the outstanding balance automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={() => setExpanded(true)}>Record Payment</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Payment</CardTitle>
        <CardDescription>Outstanding: {outstandingBalance} {currency}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="paymentDate">Payment Date</Label>
            <Input id="paymentDate" name="paymentDate" type="date" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount ({currency})</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              defaultValue={defaultPaymentAmount ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(LOAN_PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference">Reference</Label>
            <Input id="reference" name="reference" placeholder="Transfer ref, cheque no., etc." />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="principalPortion">Principal (optional)</Label>
              <Input id="principalPortion" name="principalPortion" type="number" step="0.01" min="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interestPortion">Interest (optional)</Label>
              <Input id="interestPortion" name="interestPortion" type="number" step="0.01" min="0" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="receiptFiles">Receipt / Confirmation (optional)</Label>
            <Input id="receiptFiles" name="receiptFiles" type="file" multiple accept={ALLOWED_UPLOAD_ACCEPT} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Record Payment"}</Button>
            <Button type="button" variant="outline" onClick={() => setExpanded(false)}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
