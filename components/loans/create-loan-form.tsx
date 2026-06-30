"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createLoan } from "@/lib/actions/loans";
import {
  LIABILITY_STATUS_LABELS,
  LIABILITY_TYPE_LABELS,
  PAYMENT_FREQUENCY_LABELS,
} from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EntityOption = { id: string; name: string };
type AssetOption = { id: string; name: string; entityId: string };

function FileSection({ id, name, label, description }: { id: string; name: string; label: string; description: string }) {
  return (
    <div className="space-y-2 md:col-span-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" />
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function CreateLoanForm({
  entities,
  assets,
}: {
  entities: EntityOption[];
  assets: AssetOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState("LOAN");
  const [status, setStatus] = useState("ACTIVE");
  const [entityId, setEntityId] = useState(entities[0]?.id ?? "");
  const [assetId, setAssetId] = useState("none");
  const [currency, setCurrency] = useState("OMR");
  const [paymentFrequency, setPaymentFrequency] = useState("MONTHLY");

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
        const loan = await createLoan(formData);
        router.push("/loans/" + loan.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to register loan.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register Loan</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Loan Name / Reference</Label>
            <Input id="name" name="name" required placeholder="e.g. HSBC Term Loan 2024" />
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
            <Input id="lender" name="lender" placeholder="Bank or institution name" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountReference">Account / Reference No.</Label>
            <Input id="accountReference" name="accountReference" placeholder="Loan account number" />
          </div>

          <div className="space-y-2">
            <Label>Borrowing Entity</Label>
            <Select value={entityId} onValueChange={(v) => { setEntityId(v); setAssetId("none"); }}>
              <SelectTrigger><SelectValue placeholder="Select entity" /></SelectTrigger>
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
            <Input id="amount" name="amount" required type="number" step="0.01" min="0" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="outstandingBalance">Outstanding Balance</Label>
            <Input id="outstandingBalance" name="outstandingBalance" type="number" step="0.01" min="0" placeholder="Defaults to principal if empty" />
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
            <Input id="interestRate" name="interestRate" type="number" step="0.0001" min="0" placeholder="e.g. 5.25" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input id="startDate" name="startDate" type="date" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maturityDate">Maturity Date</Label>
            <Input id="maturityDate" name="maturityDate" type="date" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentAmount">Payment Amount</Label>
            <Input id="paymentAmount" name="paymentAmount" type="number" step="0.01" min="0" />
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

          <div className="md:col-span-2 pt-2">
            <p className="text-sm font-medium text-muted-foreground">Lender contact</p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="contactName">Contact Name</Label>
            <Input id="contactName" name="contactName" placeholder="Relationship manager" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact Email</Label>
            <Input id="contactEmail" name="contactEmail" type="email" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPhone">Contact Phone</Label>
            <Input id="contactPhone" name="contactPhone" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>

          <div className="md:col-span-2 pt-2">
            <p className="text-sm font-medium text-muted-foreground">Documents</p>
          </div>

          <FileSection id="agreementFiles" name="agreementFiles" label="Loan Agreement" description="Signed loan or facility agreement." />
          <FileSection id="scheduleFiles" name="scheduleFiles" label="Payment Schedule" description="Amortization or repayment schedule." />
          <FileSection id="statementFiles" name="statementFiles" label="Statements" description="Loan statements or account summaries." />
          <FileSection id="otherFiles" name="otherFiles" label="Other Documents" description="Additional supporting files." />

          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}

          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Register Loan"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
