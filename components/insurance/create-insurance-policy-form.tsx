"use client";

import { useEffect, useState, useTransition } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { createInsurancePolicy, getInsuranceLinkOptions } from "@/lib/actions/insurance";
import {
  INSURANCE_POLICY_STATUS_LABELS,
  INSURANCE_POLICY_TYPE_LABELS,
  INSURANCE_PREMIUM_FREQUENCY_LABELS,
} from "@/lib/labels";
import { INSURANCE_CURRENCIES } from "@/lib/insurance/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";

type LinkOptions = Awaited<ReturnType<typeof getInsuranceLinkOptions>>;

export function CreateInsurancePolicyForm({ entities }: { entities: EntityOption[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [entityId, setEntityId] = useState(entities[0]?.id ?? "");
  const [policyType, setPolicyType] = useState("PROPERTY");
  const [premiumFrequency, setPremiumFrequency] = useState("ANNUAL");
  const [status, setStatus] = useState("ACTIVE");
  const [currency, setCurrency] = useState("OMR");
  const [linkOptions, setLinkOptions] = useState<LinkOptions>({
    vehicles: [],
    properties: [],
    lands: [],
    companies: [],
  });
  const [vehicleId, setVehicleId] = useState("");
  const [rePropertyId, setRePropertyId] = useState("");
  const [landParcelId, setLandParcelId] = useState("");
  const [registeredCompanyId, setRegisteredCompanyId] = useState("");

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
    if (vehicleId) formData.set("vehicleId", vehicleId);
    if (rePropertyId) formData.set("rePropertyId", rePropertyId);
    if (landParcelId) formData.set("landParcelId", landParcelId);
    if (registeredCompanyId) formData.set("registeredCompanyId", registeredCompanyId);

    startTransition(async () => {
      try {
        await createInsurancePolicy(formData);
      } catch (err) {
        if (isRedirectError(err)) throw err;
        setError(err instanceof Error ? err.message : "Failed to register policy.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register Insurance Policy</CardTitle>
        <CardDescription>
          Track property, vehicle, life, health, business, and other insurance policies.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Entity</Label>
            <EntitySelect entities={entities} value={entityId} onValueChange={setEntityId} />
          </div>
          <div className="space-y-2">
            <Label>Policy Type</Label>
            <Select value={policyType} onValueChange={setPolicyType}>
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
            <Input id="insurer" name="insurer" required placeholder="Insurance company name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="policyNumber">Policy Number</Label>
            <Input id="policyNumber" name="policyNumber" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="policyHolder">Policy Holder</Label>
            <Input id="policyHolder" name="policyHolder" placeholder="Named insured" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description / Covered Item</Label>
            <Input id="description" name="description" placeholder="e.g. Family villa, fleet vehicle" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="premium">Premium</Label>
            <Input id="premium" name="premium" type="number" step="0.01" min="0" />
          </div>
          <div className="space-y-2">
            <Label>Premium Frequency</Label>
            <Select value={premiumFrequency} onValueChange={setPremiumFrequency}>
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
            <Input id="coverageAmount" name="coverageAmount" type="number" step="0.01" min="0" />
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
            <Input id="startDate" name="startDate" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiryDate">Expiry Date</Label>
            <Input id="expiryDate" name="expiryDate" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="renewalDate">Renewal Date</Label>
            <Input id="renewalDate" name="renewalDate" type="date" />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
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
              <Label>Link to Vehicle (optional)</Label>
              <Select value={vehicleId || "none"} onValueChange={(v) => setVehicleId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
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
              <Label>Link to Property (optional)</Label>
              <Select value={rePropertyId || "none"} onValueChange={(v) => setRePropertyId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
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
              <Label>Link to Land (optional)</Label>
              <Select value={landParcelId || "none"} onValueChange={(v) => setLandParcelId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
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
              <Label>Link to Company (optional)</Label>
              <Select value={registeredCompanyId || "none"} onValueChange={(v) => setRegisteredCompanyId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
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
            <Textarea id="notes" name="notes" rows={2} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="policyFiles">Policy Documents</Label>
            <Input
              id="policyFiles"
              name="policyFiles"
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            />
          </div>

          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Register Policy"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
