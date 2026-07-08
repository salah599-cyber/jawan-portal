"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordLoanPayment } from "@/lib/actions/loan-payments";
import { splitLoanPayment } from "@/lib/loans/interest";
import { LOAN_PAYMENT_METHOD_LABELS } from "@/lib/labels";
import type { InterestCalculationMethod, PaymentFrequency } from "@/lib/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function RecordLoanPaymentForm({
  liabilityId,
  currency,
  outstandingBalance,
  principalAmount,
  interestRate,
  interestCalculationMethod,
  paymentFrequency,
  defaultPaymentAmount,
}: {
  liabilityId: string;
  currency: string;
  outstandingBalance: string;
  principalAmount: string;
  interestRate?: string | null;
  interestCalculationMethod: InterestCalculationMethod;
  paymentFrequency: PaymentFrequency | null;
  defaultPaymentAmount?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [amount, setAmount] = useState(defaultPaymentAmount ?? "");

  const splitPreview = useMemo(() => {
    const paymentAmount = parseFloat(amount);
    const balance = parseFloat(outstandingBalance);
    const principal = parseFloat(principalAmount);
    if (!paymentAmount || Number.isNaN(paymentAmount) || Number.isNaN(balance)) {
      return null;
    }

    return splitLoanPayment(
      {
        amount: principal,
        interestRate: interestRate ? parseFloat(interestRate) : null,
        interestCalculationMethod,
        paymentFrequency,
      },
      balance,
      paymentAmount,
    );
  }, [
    amount,
    outstandingBalance,
    principalAmount,
    interestRate,
    interestCalculationMethod,
    paymentFrequency,
  ]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("liabilityId", liabilityId);
    formData.set("paymentMethod", paymentMethod);
    formData.set("currency", currency);
    formData.set("amount", amount);

    startTransition(async () => {
      try {
        await recordLoanPayment(formData);
        setExpanded(false);
        setAmount(defaultPaymentAmount ?? "");
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
            Log a repayment. Only the principal portion reduces outstanding balance; interest is tracked separately.
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
        <CardDescription>
          Outstanding principal: {outstandingBalance} {currency}
        </CardDescription>
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
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          {splitPreview ? (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p>Principal (reduces outstanding): {splitPreview.principalPortion.toFixed(2)} {currency}</p>
              <p>Interest: {splitPreview.interestPortion.toFixed(2)} {currency}</p>
              <p className="text-muted-foreground">
                New outstanding: {Math.max(0, parseFloat(outstandingBalance) - splitPreview.principalPortion).toFixed(2)} {currency}
              </p>
            </div>
          ) : null}
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
              <Label htmlFor="principalPortion">Principal override (optional)</Label>
              <Input id="principalPortion" name="principalPortion" type="number" step="0.01" min="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interestPortion">Interest override (optional)</Label>
              <Input id="interestPortion" name="interestPortion" type="number" step="0.01" min="0" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="receiptFiles">Receipt / Confirmation (optional)</Label>
            <Input id="receiptFiles" name="receiptFiles" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" />
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
