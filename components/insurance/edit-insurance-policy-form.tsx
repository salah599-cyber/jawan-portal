"use client";

import { useEffect, useState, useTransition } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { updateInsurancePolicy, getInsuranceLinkOptions } from "@/lib/actions/insurance";
import {
  INSURANCE_POLICY_STATUS_LABELS,
  INSURANCE_POLICY_TYPE_LABELS,
  INSURANCE_PREMIUM_FREQUENCY_LABELS,
} from "@/lib/labels";
import { INSURANCE_CURRENCIES } from "@/lib/insurance/constants";
import { formatDateInput } from "@/lib/format";
import type { InsurancePolicyDetail } from "@/lib/actions/insurance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";

type LinkOptions = Awaited<ReturnType<typeof getInsuranceLinkOptions>>;

export function EditInsurancePolicyForm({
  policy,
  entities,
}: {
  policy: InsurancePolicyDetail;
  entities: EntityOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [entityId, setEntityId] = useState(policy.entityId);
  const [policyType, setPolicyType] = useState<string>(policy.policyType);
  const [premiumFrequency, setPremiumFrequency] = useState<string>(policy.premiumFrequency);
  const [status, setStatus] = useState<string>(policy.status);
  const [currency, setCurrency] = useState(policy.currency);
  const [linkOptions, setLinkOptions] = useState<LinkOptions>({
    vehicles: [],
    properties: [],
    lands: [],
    companies: [],
  });
  const [vehicleId, setVehicleId] = useState(policy.vehicleId ?? "");
  const [rePropertyId, setRePropertyId] = useState(policy.rePropertyId ?? "");
  const [landParcelId, setLandParcelId] = useState(policy.landParcelId ?? "");
  const [registeredCompanyId, setRegisteredCompanyId] = useState(policy.registeredCompanyId ?? "");

  useEffect(() => {
    if (!entityId) return;
    getInsuranceLinkOptions(entityId).then(setLinkOptions).catch(() => {
      setLinkOptions({ vehicles: [], properties: [], lands: [], companies: [] });
    });
  }, [entityId]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("entityId", entityId);
    formData.set("policyType", policyType);
    formData.set("premiumFrequency", premiumFrequency);
    formData.set("status", status);
    formData.set("currency", currency);
    formData.set("vehicleId", vehicleId);
    formData.set("rePropertyId", rePropertyId);
    formData.set("landParcelId", landParcelId);
    formData.set("registeredCompanyId", registeredCompanyId);

    startTransition(async () => {
      try {
        await updateInsurancePolicy(policy.id, formData);
      } catch (err) {
        if (isRedirectError(err)) throw err;
        setError(err instanceof Error ? err.message : "Failed to update policy.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit {policy.policyNumber}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Entity</Label>
            <EntitySelect entities={entities} value={entityId} onValueChange={setEntityId} />
          </div>
          <div className="space-y-2">
            <Label>Policy Type</Label>
            <Select value={policyType} onValueChange={(v) => setPolicyType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(INSURANCE_POLICY_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="insurer">Insurer</Label>
            <Input id="insurer" name="insurer" required defaultValue={policy.insurer} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="policyNumber">Policy Number</Label>
            <Input id="policyNumber" name="policyNumber" required defaultValue={policy.policyNumber} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="policyHolder">Policy Holder</Label>
            <Input id="policyHolder" name="policyHolder" defaultValue={policy.policyHolder ?? ""} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" defaultValue={policy.description ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="premium">Premium</Label>
            <Input id="premium" name="premium" type="number" step="0.01" defaultValue={policy.premium?.toString() ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>Premium Frequency</Label>
            <Select value={premiumFrequency} onValueChange={(v) => setPremiumFrequency(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(INSURANCE_PREMIUM_FREQUENCY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="coverageAmount">Coverage Amount</Label>
            <Input id="coverageAmount" name="coverageAmount" type="number" step="0.01" defaultValue={policy.coverageAmount?.toString() ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INSURANCE_CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input id="startDate" name="startDate" type="date" defaultValue={formatDateInput(policy.startDate)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiryDate">Expiry Date</Label>
            <Input id="expiryDate" name="expiryDate" type="date" defaultValue={formatDateInput(policy.expiryDate)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="renewalDate">Renewal Date</Label>
            <Input id="renewalDate" name="renewalDate" type="date" defaultValue={formatDateInput(policy.renewalDate)} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(INSURANCE_POLICY_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {linkOptions.vehicles.length > 0 ? (
            <div className="space-y-2">
              <Label>Link to Vehicle</Label>
              <Select value={vehicleId || "none"} onValueChange={(v) => setVehicleId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {linkOptions.vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {linkOptions.properties.length > 0 ? (
            <div className="space-y-2">
              <Label>Link to Property</Label>
              <Select value={rePropertyId || "none"} onValueChange={(v) => setRePropertyId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {linkOptions.properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {linkOptions.lands.length > 0 ? (
            <div className="space-y-2">
              <Label>Link to Land</Label>
              <Select value={landParcelId || "none"} onValueChange={(v) => setLandParcelId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {linkOptions.lands.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {linkOptions.companies.length > 0 ? (
            <div className="space-y-2">
              <Label>Link to Company</Label>
              <Select value={registeredCompanyId || "none"} onValueChange={(v) => setRegisteredCompanyId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {linkOptions.companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} defaultValue={policy.notes ?? ""} />
          </div>

          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save Changes"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
