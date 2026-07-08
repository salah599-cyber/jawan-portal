"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCheque } from "@/lib/actions/cheques";
import {
  CHEQUE_DIRECTION_LABELS,
  CHEQUE_STATUS_LABELS,
} from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntitySelect } from "@/components/platform/entity-select";
import { ALLOWED_UPLOAD_ACCEPT } from "@/lib/upload-limits";

type BankAccountOption = {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  entityId: string | null;
  currency: string;
};

function FileSection({ id, name, label, description }: { id: string; name: string; label: string; description: string }) {
  return (
    <div className="space-y-2 md:col-span-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} type="file" multiple accept={ALLOWED_UPLOAD_ACCEPT} />
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function CreateChequeForm({
  entities,
  bankAccounts,
}: {
  entities: { id: string; name: string }[];
  bankAccounts: BankAccountOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState("ISSUED");
  const [status, setStatus] = useState("PENDING");
  const [entityId, setEntityId] = useState(entities[0]?.id ?? "");
  const [bankAccountId, setBankAccountId] = useState("none");
  const [currency, setCurrency] = useState("OMR");

  const entityBankAccounts = useMemo(
    () => bankAccounts.filter((a) => !a.entityId || a.entityId === entityId),
    [bankAccounts, entityId],
  );

  const payeeLabel = direction === "ISSUED" ? "Payee (beneficiary)" : "Payer";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("direction", direction);
    formData.set("status", status);
    formData.set("entityId", entityId);
    formData.set("bankAccountId", bankAccountId);
    formData.set("currency", currency);

    startTransition(async () => {
      try {
        const cheque = await createCheque(formData);
        router.push("/cheques/" + cheque.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to register cheque.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register Cheque</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Direction</Label>
            <Select value={direction} onValueChange={setDirection}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CHEQUE_DIRECTION_LABELS).map(([value, label]) => (
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
                {Object.entries(CHEQUE_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chequeNumber">Cheque Number</Label>
            <Input id="chequeNumber" name="chequeNumber" required placeholder="Enter cheque number" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payee">{payeeLabel}</Label>
            <Input id="payee" name="payee" required placeholder={direction === "ISSUED" ? "Who receives payment" : "Who issued the cheque"} />
          </div>

          <div className="space-y-2">
            <Label>Entity</Label>
            <EntitySelect
              entities={entities}
              value={entityId}
              onValueChange={(v) => { setEntityId(v); setBankAccountId("none"); }}
            />
          </div>

          <div className="space-y-2">
            <Label>Bank Account (optional)</Label>
            <Select value={bankAccountId} onValueChange={setBankAccountId}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {entityBankAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.bankName} · {account.accountName} ({account.accountNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name (if no account linked)</Label>
            <Input id="bankName" name="bankName" placeholder="Bank name" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" name="amount" required type="number" step="0.001" min="0" />
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
            <Label htmlFor="issueDate">Issue Date</Label>
            <Input id="issueDate" name="issueDate" type="date" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date (post-dated, optional)</Label>
            <Input id="dueDate" name="dueDate" type="date" />
          </div>

          {status === "CLEARED" ? (
            <div className="space-y-2">
              <Label htmlFor="clearanceDate">Clearance Date</Label>
              <Input id="clearanceDate" name="clearanceDate" type="date" required />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="clearanceDate">Clearance Date (optional)</Label>
              <Input id="clearanceDate" name="clearanceDate" type="date" />
            </div>
          )}

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="purpose">Purpose / Memo</Label>
            <Input id="purpose" name="purpose" placeholder="Brief description of payment" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>

          <div className="md:col-span-2 pt-2">
            <p className="text-sm font-medium text-muted-foreground">Documents</p>
          </div>

          <FileSection id="chequeCopyFiles" name="chequeCopyFiles" label="Cheque Copy" description="Scanned or photographed cheque." />
          <FileSection id="depositSlipFiles" name="depositSlipFiles" label="Deposit Slip" description="Bank deposit slip if applicable." />
          <FileSection id="confirmationFiles" name="confirmationFiles" label="Bank Confirmation" description="Clearance or bank confirmation." />
          <FileSection id="otherFiles" name="otherFiles" label="Other Documents" description="Additional supporting files." />

          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}

          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Register Cheque"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
