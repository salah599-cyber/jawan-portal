"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateLoan } from "@/lib/actions/loans";
import {
  LIABILITY_STATUS_LABELS,
  LIABILITY_TYPE_LABELS,
  PAYMENT_FREQUENCY_LABELS,
} from "@/lib/labels";
import { formatDateInput, formatDecimalInput } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EntityOption = { id: string; name: string };
type AssetOption = { id: string; name: string; entityId: string };

type LoanRecord = {
  id: string;
  name: string;
  type: string;
  status: string;
  amount: { toString(): string };
  outstandingBalance: { toString(): string } | null;
  currency: string;
  interestRate: { toString(): string } | null;
  startDate: Date | null;
  maturityDate: Date | null;
  paymentAmount: { toString(): string } | null;
  paymentFrequency: string | null;
  lender: string | null;
  accountReference: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  entityId: string;
  assetId: string | null;
};

export function EditLoanForm({
  loan,
  entities,
  assets,
}: {
  loan: LoanRecord;
  entities: EntityOption[];
  assets: AssetOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState(loan.type);
  const [status, setStatus] = useState(loan.status);
  const [entityId, setEntityId] = useState(loan.entityId);
  const [assetId, setAssetId] = useState(loan.assetId ?? "none");
  const [currency, setCurrency] = useState(loan.currency);
  const [paymentFrequency, setPaymentFrequency] = useState(loan.paymentFrequency ?? "MONTHLY");

  const entityAssets = assets.filter((a) => a.entityId === entityId);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("type", type);
    formData.set("status", status);
    formData.set("entityId", entityId);
    formData.set("assetId", assetId);
    formData.set("currency", currency);
    formData.set("paymentFrequency", paymentFrequency);

    startTransition(async () => {
      try {
        await updateLoan(loan.id, formData);
        router.push("/loans/" + loan.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update loan.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Loan</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Loan Name / Reference</Label>
            <Input id="name" name="name" required defaultValue={loan.name} />
          </div>

          <div className="space-y-2">
            <Label>Loan Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(LIABILITY_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(LIABILITY_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lender">Lender</Label>
            <Input id="lender" name="lender" defaultValue={loan.lender ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountReference">Account / Reference No.</Label>
            <Input id="accountReference" name="accountReference" defaultValue={loan.accountReference ?? ""} />
          </div>

          <div className="space-y-2">
            <Label>Borrowing Entity</Label>
            <Select value={entityId} onValueChange={(v) => { setEntityId(v); setAssetId("none"); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {entities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Linked Asset (collateral)</Label>
            <Select value={assetId} onValueChange={setAssetId}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {entityAssets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>{asset.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Principal Amount</Label>
            <Input id="amount" name="amount" required type="number" step="0.01" min="0" defaultValue={formatDecimalInput(loan.amount)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="outstandingBalance">Outstanding Balance</Label>
            <Input id="outstandingBalance" name="outstandingBalance" type="number" step="0.01" min="0" defaultValue={formatDecimalInput(loan.outstandingBalance)} />
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["OMR", "USD", "EUR", "GBP", "AED"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="interestRate">Interest Rate (%)</Label>
            <Input id="interestRate" name="interestRate" type="number" step="0.0001" min="0" defaultValue={formatDecimalInput(loan.interestRate)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input id="startDate" name="startDate" type="date" defaultValue={formatDateInput(loan.startDate)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maturityDate">Maturity Date</Label>
            <Input id="maturityDate" name="maturityDate" type="date" defaultValue={formatDateInput(loan.maturityDate)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentAmount">Payment Amount</Label>
            <Input id="paymentAmount" name="paymentAmount" type="number" step="0.01" min="0" defaultValue={formatDecimalInput(loan.paymentAmount)} />
          </div>

          <div className="space-y-2">
            <Label>Payment Frequency</Label>
            <Select value={paymentFrequency} onValueChange={setPaymentFrequency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_FREQUENCY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="contactName">Lender Contact Name</Label>
            <Input id="contactName" name="contactName" defaultValue={loan.contactName ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact Email</Label>
            <Input id="contactEmail" name="contactEmail" type="email" defaultValue={loan.contactEmail ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPhone">Contact Phone</Label>
            <Input id="contactPhone" name="contactPhone" defaultValue={loan.contactPhone ?? ""} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} defaultValue={loan.notes ?? ""} />
          </div>

          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}

          <div className="md:col-span-2 flex gap-2">
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save Changes"}</Button>
            <Button type="button" variant="outline" onClick={() => router.push("/loans/" + loan.id)}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
