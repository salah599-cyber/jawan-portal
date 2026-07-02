"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createLease } from "@/lib/actions/real-estate";
import {
  RE_PAYMENT_FREQUENCY_LABELS,
  RE_PAYMENT_METHOD_LABELS,
} from "@/lib/labels";
import { DEFAULT_NOTICE_PERIOD_DAYS } from "@/lib/real-estate/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const TENANT_ID_TYPE_LABELS: Record<string, string> = {
  OMANI_ID: "Omani ID",
  PASSPORT: "Passport",
  RESIDENCE_CARD: "Residence Card",
};

type UnitOption = {
  id: string;
  unitNumber: string;
  tenants: { id: string; fullName: string }[];
};

export function CreateLeaseForm({
  units,
  defaultUnitId,
  defaultTenantId,
  submitLabel = "Create Lease",
  onSubmit,
  onSuccess,
}: {
  units: UnitOption[];
  defaultUnitId?: string;
  defaultTenantId?: string;
  submitLabel?: string;
  onSubmit?: (formData: FormData) => Promise<void>;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [unitId, setUnitId] = useState(defaultUnitId ?? units[0]?.id ?? "");
  const [tenantMode, setTenantMode] = useState<"existing" | "new">(
    defaultTenantId ? "existing" : "new",
  );
  const [tenantId, setTenantId] = useState(defaultTenantId ?? "none");
  const [paymentFrequency, setPaymentFrequency] = useState("MONTHLY");
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [idType, setIdType] = useState("PASSPORT");

  const selectedUnit = units.find((unit) => unit.id === unitId);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!unitId) {
      setError("Select a unit.");
      return;
    }
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("unitId", unitId);
    formData.set("paymentFrequency", paymentFrequency);
    formData.set("paymentMethod", paymentMethod);
    formData.set("autoRenew", String(formData.get("autoRenew") === "on"));
    formData.set("securityDepositPaid", String(formData.get("securityDepositPaid") === "on"));

    if (tenantMode === "existing" && tenantId !== "none") {
      formData.set("tenantId", tenantId);
    } else {
      formData.set("idType", idType);
    }

    startTransition(async () => {
      try {
        if (onSubmit) {
          await onSubmit(formData);
        } else {
          await createLease(formData);
        }
        onSuccess?.();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save lease.");
      }
    });
  }

  if (units.length === 0) {
    return <p className="text-sm text-muted-foreground">Add units before creating a lease.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label>Unit</Label>
        <Select value={unitId} onValueChange={setUnitId}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {units.map((unit) => (
              <SelectItem key={unit.id} value={unit.id}>Unit {unit.unitNumber}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Tenant</Label>
        <Select
          value={tenantMode}
          onValueChange={(value) => setTenantMode(value as "existing" | "new")}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New Tenant</SelectItem>
            <SelectItem value="existing">Existing Tenant</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {tenantMode === "existing" ? (
        <div className="space-y-2 md:col-span-2">
          <Label>Select Tenant</Label>
          <Select value={tenantId} onValueChange={setTenantId}>
            <SelectTrigger><SelectValue placeholder="Choose tenant" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Select tenant</SelectItem>
              {(selectedUnit?.tenants ?? []).map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>{tenant.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="fullName">Tenant Full Name</Label>
            <Input id="fullName" name="fullName" required defaultValue="" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nationality">Nationality</Label>
            <Input id="nationality" name="nationality" />
          </div>
          <div className="space-y-2">
            <Label>ID Type</Label>
            <Select value={idType} onValueChange={setIdType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TENANT_ID_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="idNumber">ID Number</Label>
            <Input id="idNumber" name="idNumber" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phonePrimary">Phone</Label>
            <Input id="phonePrimary" name="phonePrimary" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="leaseStartDate">Lease Start</Label>
        <Input id="leaseStartDate" name="leaseStartDate" type="date" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="leaseEndDate">Lease End</Label>
        <Input id="leaseEndDate" name="leaseEndDate" type="date" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="rentAmountOmr">Rent Amount (OMR)</Label>
        <Input id="rentAmountOmr" name="rentAmountOmr" required />
      </div>
      <div className="space-y-2">
        <Label>Payment Frequency</Label>
        <Select value={paymentFrequency} onValueChange={setPaymentFrequency}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(RE_PAYMENT_FREQUENCY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <Label htmlFor="noticePeriodDays">Notice Period (days)</Label>
        <Input
          id="noticePeriodDays"
          name="noticePeriodDays"
          type="number"
          defaultValue={DEFAULT_NOTICE_PERIOD_DAYS}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="securityDepositOmr">Security Deposit (OMR)</Label>
        <Input id="securityDepositOmr" name="securityDepositOmr" />
      </div>
      {paymentMethod === "PDC" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="pdcBank">PDC Bank</Label>
            <Input id="pdcBank" name="pdcBank" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="pdcChequeNumbers">PDC Cheques JSON</Label>
            <Textarea
              id="pdcChequeNumbers"
              name="pdcChequeNumbers"
              rows={3}
              placeholder={'[{"chequeNumber":"12345","bank":"Bank Muscat"}]'}
            />
          </div>
        </>
      ) : null}
      <div className="flex items-center gap-2">
        <input id="autoRenew" name="autoRenew" type="checkbox" className="size-4" />
        <Label htmlFor="autoRenew">Auto-renew</Label>
      </div>
      <div className="flex items-center gap-2">
        <input id="securityDepositPaid" name="securityDepositPaid" type="checkbox" className="size-4" />
        <Label htmlFor="securityDepositPaid">Security deposit paid</Label>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>
      {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving..." : submitLabel}</Button>
      </div>
    </form>
  );
}
