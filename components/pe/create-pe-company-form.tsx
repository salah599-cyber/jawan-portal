"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { createPeCompany } from "@/lib/actions/pe-portfolio";
import { PE_STAGE_LABELS, PE_STATUS_LABELS } from "@/lib/labels";
import { PE_COUNTRY_OPTIONS, PE_REPORTING_CURRENCIES, PE_SECTOR_OPTIONS } from "@/lib/pe/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";

export function CreatePeCompanyForm({ entities }: { entities: EntityOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState("SEED");
  const [status, setStatus] = useState("ACTIVE");
  const [entityId, setEntityId] = useState(entities[0]?.id ?? "");
  const [reportingCurrency, setReportingCurrency] = useState("USD");
  const [country, setCountry] = useState("");
  const [sector, setSector] = useState("");
  const submittingRef = useRef(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submittingRef.current || pending) return;

    setError(null);
    submittingRef.current = true;
    const formData = new FormData(e.currentTarget);
    formData.set("stage", stage);
    formData.set("status", status);
    formData.set("entityId", entityId);
    formData.set("reportingCurrency", reportingCurrency);
    if (country) formData.set("country", country);
    if (sector) formData.set("sector", sector);

    startTransition(async () => {
      try {
        await createPeCompany(formData);
      } catch (err) {
        if (isRedirectError(err)) throw err;
        submittingRef.current = false;
        setError(err instanceof Error ? err.message : "Failed to add company.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Portfolio Company</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Company Name</Label>
            <Input id="name" name="name" required placeholder="e.g. Acme Technologies Inc." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tradingName">Trading Name</Label>
            <Input id="tradingName" name="tradingName" placeholder="Brand or DBA name" />
          </div>

          <div className="space-y-2">
            <Label>Entity</Label>
            <EntitySelect entities={entities} value={entityId} onValueChange={setEntityId} />
          </div>

          <div className="space-y-2">
            <Label>Country</Label>
            <Select value={country || "none"} onValueChange={(v) => setCountry(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not specified</SelectItem>
                {PE_COUNTRY_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="legalEntityType">Legal Entity Type</Label>
            <Input id="legalEntityType" name="legalEntityType" placeholder="e.g. C-Corp, Ltd, GmbH" />
          </div>

          <div className="space-y-2">
            <Label>Sector</Label>
            <Select value={sector || "none"} onValueChange={(v) => setSector(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select sector" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not specified</SelectItem>
                {PE_SECTOR_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PE_STAGE_LABELS).map(([value, label]) => (
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
                {Object.entries(PE_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Reporting Currency</Label>
            <Select value={reportingCurrency} onValueChange={setReportingCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PE_REPORTING_CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="riskRating">Risk Rating (1–5)</Label>
            <Input id="riskRating" name="riskRating" type="number" min={1} max={5} placeholder="Optional" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} placeholder="Investment thesis, key risks, etc." />
          </div>

          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}

          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Add Company"}
            </Button>
            <Button type="button" variant="outline" disabled={pending} onClick={() => router.push("/portfolio/pe")}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
