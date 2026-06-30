"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCompany } from "@/lib/actions/companies";
import { CompanyOwnersFields } from "@/components/companies/company-owners-fields";
import { ASSET_STATUS_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EntityOption = { id: string; name: string };

function FileSection({ id, name, label, description }: { id: string; name: string; label: string; description: string }) {
  return (
    <div className="space-y-2 md:col-span-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" />
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function CreateCompanyForm({ entities }: { entities: EntityOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("ACTIVE");
  const [entityId, setEntityId] = useState(entities[0]?.id ?? "");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("status", status);
    formData.set("entityId", entityId);

    startTransition(async () => {
      try {
        const company = await createCompany(formData);
        router.push("/companies/" + company.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to register company.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register Company</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-muted-foreground">Registration details</p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Company Name</Label>
            <Input id="name" name="name" required placeholder="e.g. Jawan Holdings LLC" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="registrationNumber">Registration Number</Label>
            <Input id="registrationNumber" name="registrationNumber" required placeholder="Commercial registration number" />
          </div>

          <div className="space-y-2">
            <Label>Entity</Label>
            <Select value={entityId} onValueChange={setEntityId}>
              <SelectTrigger><SelectValue placeholder="Select entity" /></SelectTrigger>
              <SelectContent>
                {entities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="registrationDate">Registration Date</Label>
            <Input id="registrationDate" name="registrationDate" type="date" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="registrationExpiryDate">Registration Expiry Date</Label>
            <Input id="registrationExpiryDate" name="registrationExpiryDate" type="date" />
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

          <CompanyOwnersFields />

          <div className="md:col-span-2 pt-2">
            <p className="text-sm font-medium text-muted-foreground">CEO</p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="ceoName">CEO Name</Label>
            <Input id="ceoName" name="ceoName" placeholder="Chief Executive Officer" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ceoEmail">CEO Email</Label>
            <Input id="ceoEmail" name="ceoEmail" type="email" placeholder="ceo@example.com" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ceoPhone">CEO Phone</Label>
            <Input id="ceoPhone" name="ceoPhone" placeholder="+968 ..." />
          </div>

          <div className="md:col-span-2 pt-2">
            <p className="text-sm font-medium text-muted-foreground">Management</p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="managementContactName">Management Contact Name</Label>
            <Input id="managementContactName" name="managementContactName" placeholder="Primary management contact" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="managementEmail">Management Email</Label>
            <Input id="managementEmail" name="managementEmail" type="email" placeholder="management@example.com" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="managementPhone">Management Phone</Label>
            <Input id="managementPhone" name="managementPhone" placeholder="+968 ..." />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="managementNotes">Management Details</Label>
            <Textarea id="managementNotes" name="managementNotes" rows={3} placeholder="Board members, key managers, or other management notes" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} placeholder="Optional notes" />
          </div>

          <div className="md:col-span-2 pt-2">
            <p className="text-sm font-medium text-muted-foreground">Documents</p>
          </div>

          <FileSection id="registrationCopyFiles" name="registrationCopyFiles" label="Registration Copy" description="Commercial registration certificate or copy." />
          <FileSection id="chamberCopyFiles" name="chamberCopyFiles" label="Chamber of Commerce Copy" description="Chamber of Commerce membership or related documents." />
          <FileSection id="financialsFiles" name="financialsFiles" label="Financial Statements" description="Audited accounts, management accounts, or financial reports." />
          <FileSection id="otherFiles" name="otherFiles" label="Other Documents" description="Any additional supporting files." />

          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}

          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Register Company"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
