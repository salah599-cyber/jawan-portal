"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCompany } from "@/lib/actions/companies";
import type { CompanyOwnerInput } from "@/lib/actions/companies";
import { CompanyOwnersFields } from "@/components/companies/company-owners-fields";
import { ASSET_STATUS_LABELS } from "@/lib/labels";
import { formatDateInput } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EntityOption = { id: string; name: string };

type CompanyRecord = {
  id: string;
  name: string;
  registrationNumber: string;
  registrationDate: Date | null;
  registrationExpiryDate: Date | null;
  ceoName: string | null;
  ceoEmail: string | null;
  ceoPhone: string | null;
  managementContactName: string | null;
  managementEmail: string | null;
  managementPhone: string | null;
  managementNotes: string | null;
  entityId: string;
  status: string;
  notes: string | null;
  owners: Array<{
    name: string;
    ownershipPct: { toString(): string } | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    notes: string | null;
  }>;
};

export function EditCompanyForm({ company, entities }: { company: CompanyRecord; entities: EntityOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(company.status);
  const [entityId, setEntityId] = useState(company.entityId);

  const initialOwners: CompanyOwnerInput[] = company.owners.map((owner) => ({
    name: owner.name,
    ownershipPct: owner.ownershipPct?.toString() ?? "",
    email: owner.email ?? "",
    phone: owner.phone ?? "",
    address: owner.address ?? "",
    notes: owner.notes ?? "",
  }));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("status", status);
    formData.set("entityId", entityId);

    startTransition(async () => {
      try {
        await updateCompany(company.id, formData);
        router.push("/companies/" + company.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update company.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Company</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Company Name</Label>
            <Input id="name" name="name" required defaultValue={company.name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="registrationNumber">Registration Number</Label>
            <Input id="registrationNumber" name="registrationNumber" required defaultValue={company.registrationNumber} />
          </div>

          <div className="space-y-2">
            <Label>Entity</Label>
            <Select value={entityId} onValueChange={setEntityId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {entities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="registrationDate">Registration Date</Label>
            <Input id="registrationDate" name="registrationDate" type="date" defaultValue={formatDateInput(company.registrationDate)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="registrationExpiryDate">Registration Expiry Date</Label>
            <Input id="registrationExpiryDate" name="registrationExpiryDate" type="date" defaultValue={formatDateInput(company.registrationExpiryDate)} />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ASSET_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <CompanyOwnersFields initialOwners={initialOwners} />

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="ceoName">CEO Name</Label>
            <Input id="ceoName" name="ceoName" defaultValue={company.ceoName ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ceoEmail">CEO Email</Label>
            <Input id="ceoEmail" name="ceoEmail" type="email" defaultValue={company.ceoEmail ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ceoPhone">CEO Phone</Label>
            <Input id="ceoPhone" name="ceoPhone" defaultValue={company.ceoPhone ?? ""} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="managementContactName">Management Contact Name</Label>
            <Input id="managementContactName" name="managementContactName" defaultValue={company.managementContactName ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="managementEmail">Management Email</Label>
            <Input id="managementEmail" name="managementEmail" type="email" defaultValue={company.managementEmail ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="managementPhone">Management Phone</Label>
            <Input id="managementPhone" name="managementPhone" defaultValue={company.managementPhone ?? ""} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="managementNotes">Management Details</Label>
            <Textarea id="managementNotes" name="managementNotes" rows={3} defaultValue={company.managementNotes ?? ""} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} defaultValue={company.notes ?? ""} />
          </div>

          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}

          <div className="md:col-span-2 flex gap-2">
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save Changes"}</Button>
            <Button type="button" variant="outline" onClick={() => router.push("/companies/" + company.id)}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
