"use client";

import { useState, useTransition } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { createFamilyMember } from "@/lib/actions/family-members";
import { FamilyContactFields } from "@/components/family/family-contact-fields";
import { FamilySignatoryRolesFields } from "@/components/family/family-signatory-roles-fields";
import {
  FAMILY_KYC_STATUS_LABELS,
  FAMILY_MEMBER_ID_TYPE_LABELS,
  FAMILY_RELATIONSHIP_LABELS,
} from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type LinkOptions = Awaited<ReturnType<typeof import("@/lib/actions/family-members").getFamilyLinkOptions>>;

export function CreateFamilyMemberForm({ linkOptions }: { linkOptions: LinkOptions }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [relationship, setRelationship] = useState("");
  const [idType, setIdType] = useState("");
  const [kycStatus, setKycStatus] = useState("NOT_STARTED");
  const [isBeneficiary, setIsBeneficiary] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    if (relationship) formData.set("relationship", relationship);
    if (idType) formData.set("idType", idType);
    formData.set("kycStatus", kycStatus);
    if (isBeneficiary) formData.set("isBeneficiary", "true");

    startTransition(async () => {
      try {
        await createFamilyMember(formData);
      } catch (err) {
        if (isRedirectError(err)) throw err;
        setError(err instanceof Error ? err.message : "Failed to create family member.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Family Member</CardTitle>
        <CardDescription>
          Register a family member with contact details, signatory roles, and optional POA documents.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" name="fullName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferredName">Preferred Name</Label>
            <Input id="preferredName" name="preferredName" />
          </div>
          <div className="space-y-2">
            <Label>Relationship</Label>
            <Select value={relationship} onValueChange={setRelationship}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {Object.entries(FAMILY_RELATIONSHIP_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input id="dateOfBirth" name="dateOfBirth" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nationality">Nationality</Label>
            <Input id="nationality" name="nationality" />
          </div>
          <div className="space-y-2">
            <Label>ID Type</Label>
            <Select value={idType} onValueChange={setIdType}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {Object.entries(FAMILY_MEMBER_ID_TYPE_LABELS).map(([value, label]) => (
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
            <Label htmlFor="idExpiryDate">ID Expiry</Label>
            <Input id="idExpiryDate" name="idExpiryDate" type="date" />
          </div>
          <div className="space-y-2">
            <Label>KYC Status</Label>
            <Select value={kycStatus} onValueChange={setKycStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(FAMILY_KYC_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <FamilyContactFields />

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" name="address" rows={2} />
          </div>

          <FamilySignatoryRolesFields linkOptions={linkOptions} />

          <div className="space-y-4 rounded-lg border p-4 md:col-span-2">
            <div>
              <p className="text-sm font-medium">Power of Attorney</p>
              <p className="text-xs text-muted-foreground">
                Upload POA documents now or add more from the member profile later.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="poaExpiryDate">POA Expiry Date</Label>
                <Input id="poaExpiryDate" name="poaExpiryDate" type="date" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="poaFiles">POA Files</Label>
                <Input id="poaFiles" name="poaFiles" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:col-span-2">
            <input
              id="isBeneficiary"
              type="checkbox"
              className="size-4"
              checked={isBeneficiary}
              onChange={(e) => setIsBeneficiary(e.target.checked)}
            />
            <Label htmlFor="isBeneficiary">Mark as beneficiary</Label>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>
          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Create Member"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
