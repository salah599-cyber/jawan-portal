"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePeCompany } from "@/lib/actions/pe-portfolio";
import { PE_STAGE_LABELS, PE_STATUS_LABELS } from "@/lib/labels";
import { PE_COUNTRY_OPTIONS, PE_REPORTING_CURRENCIES, PE_SECTOR_OPTIONS } from "@/lib/pe/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";

type CompanyRecord = {
  id: string;
  name: string;
  tradingName: string | null;
  country: string | null;
  legalEntityType: string | null;
  sector: string | null;
  stage: string;
  status: string;
  riskRating: number | null;
  notes: string | null;
  entityId: string;
  reportingCurrency: string;
};

export function EditPeCompanyForm({
  company,
  entities,
}: {
  company: CompanyRecord;
  entities: EntityOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState(company.stage);
  const [status, setStatus] = useState(company.status);
  const [entityId, setEntityId] = useState(company.entityId);
  const [reportingCurrency, setReportingCurrency] = useState(company.reportingCurrency);
  const [country, setCountry] = useState(company.country ?? "");
  const [sector, setSector] = useState(company.sector ?? "");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("stage", stage);
    formData.set("status", status);
    formData.set("entityId", entityId);
    formData.set("reportingCurrency", reportingCurrency);
    if (country) formData.set("country", country);
    if (sector) formData.set("sector", sector);

    startTransition(async () => {
      try {
        await updatePeCompany(company.id, formData);
        router.push("/portfolio/pe/" + company.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update company.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit {company.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Company Name</Label>
            <Input id="name" name="name" required defaultValue={company.name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tradingName">Trading Name</Label>
            <Input id="tradingName" name="tradingName" defaultValue={company.tradingName ?? ""} />
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
            <Input id="legalEntityType" name="legalEntityType" defaultValue={company.legalEntityType ?? ""} />
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
            <Input
              id="riskRating"
              name="riskRating"
              type="number"
              min={1}
              max={5}
              defaultValue={company.riskRating ?? ""}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} defaultValue={company.notes ?? ""} />
          </div>

          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}

          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/portfolio/pe/" + company.id)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
