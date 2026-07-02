"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markRentPaid } from "@/lib/actions/real-estate";
import { RE_PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { formatDateInput } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function MarkRentPaidForm({
  scheduleId,
  defaultAmount,
  onSuccess,
}: {
  scheduleId: string;
  defaultAmount?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("paymentMethod", paymentMethod);

    startTransition(async () => {
      try {
        await markRentPaid(scheduleId, formData);
        onSuccess?.();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to record payment.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="space-y-2">
        <Label htmlFor="paidDate">Paid Date</Label>
        <Input
          id="paidDate"
          name="paidDate"
          type="date"
          required
          defaultValue={formatDateInput(new Date())}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="paidAmountOmr">Paid Amount (OMR)</Label>
        <Input id="paidAmountOmr" name="paidAmountOmr" required defaultValue={defaultAmount ?? ""} />
      </div>
      <div className="space-y-2">
        <Label>Payment Method</Label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(RE_PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="chequeNumber">Cheque Number</Label>
        <Input id="chequeNumber" name="chequeNumber" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bankReference">Bank Reference</Label>
        <Input id="bankReference" name="bankReference" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="receiptNumber">Receipt Number</Label>
        <Input id="receiptNumber" name="receiptNumber" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Record Payment"}</Button>
    </form>
  );
}
