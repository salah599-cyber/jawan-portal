"use client";

import { useState, useTransition } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { updateFamilyMember } from "@/lib/actions/family-members";
import { FamilyContactFields } from "@/components/family/family-contact-fields";
import {
  FAMILY_KYC_STATUS_LABELS,
  FAMILY_MEMBER_ID_TYPE_LABELS,
  FAMILY_RELATIONSHIP_LABELS,
} from "@/lib/labels";
import type { SerializedFamilyMember } from "@/lib/family/serialize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function EditFamilyMemberForm({ member }: { member: SerializedFamilyMember }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [relationship, setRelationship] = useState(member.relationship ?? "");
  const [idType, setIdType] = useState(member.idType ?? "");
  const [kycStatus, setKycStatus] = useState<string>(member.kycStatus);
  const [isBeneficiary, setIsBeneficiary] = useState(member.isBeneficiary);
  const [deceased, setDeceased] = useState(member.deceased);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    if (relationship) formData.set("relationship", relationship);
    if (idType) formData.set("idType", idType);
    formData.set("kycStatus", kycStatus);
    if (isBeneficiary) formData.set("isBeneficiary", "true");
    if (deceased) formData.set("deceased", "true");

    startTransition(async () => {
      try {
        await updateFamilyMember(member.id, formData);
      } catch (err) {
        if (isRedirectError(err)) throw err;
        setError(err instanceof Error ? err.message : "Failed to update family member.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Family Member</CardTitle>
        <CardDescription>{member.fullName}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" name="fullName" defaultValue={member.fullName} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferredName">Preferred Name</Label>
            <Input id="preferredName" name="preferredName" defaultValue={member.preferredName ?? ""} />
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
            <Input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              defaultValue={member.dateOfBirth?.slice(0, 10) ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nationality">Nationality</Label>
            <Input id="nationality" name="nationality" defaultValue={member.nationality ?? ""} />
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
            <Input id="idNumber" name="idNumber" defaultValue={member.idNumber ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="idExpiryDate">ID Expiry</Label>
            <Input
              id="idExpiryDate"
              name="idExpiryDate"
              type="date"
              defaultValue={member.idExpiryDate?.slice(0, 10) ?? ""}
            />
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
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="kycNotes">KYC Notes</Label>
            <Textarea id="kycNotes" name="kycNotes" rows={2} defaultValue={member.kycNotes ?? ""} />
          </div>

          <FamilyContactFields
            initialEmails={member.emails.map((row) => ({ email: row.email, label: row.label ?? undefined }))}
            initialPhones={member.phones.map((row) => ({ phone: row.phone, label: row.label ?? undefined }))}
            legacyEmail={member.email}
            legacyPrimaryPhone={member.phonePrimary}
            legacySecondaryPhone={member.phoneSecondary}
          />

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" name="address" rows={2} defaultValue={member.address ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyContactName">Emergency Contact</Label>
            <Input id="emergencyContactName" name="emergencyContactName" defaultValue={member.emergencyContactName ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyContactPhone">Emergency Phone</Label>
            <Input id="emergencyContactPhone" name="emergencyContactPhone" defaultValue={member.emergencyContactPhone ?? ""} />
          </div>
          <div className="flex flex-wrap gap-6 md:col-span-2">
            <div className="flex items-center gap-2">
              <input
                id="isBeneficiary"
                type="checkbox"
                className="size-4"
                checked={isBeneficiary}
                onChange={(e) => setIsBeneficiary(e.target.checked)}
              />
              <Label htmlFor="isBeneficiary">Beneficiary</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="deceased"
                type="checkbox"
                className="size-4"
                checked={deceased}
                onChange={(e) => setDeceased(e.target.checked)}
              />
              <Label htmlFor="deceased">Deceased</Label>
            </div>
          </div>
          {deceased ? (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="dateOfDeath">Date of Death</Label>
              <Input
                id="dateOfDeath"
                name="dateOfDeath"
                type="date"
                defaultValue={member.dateOfDeath?.slice(0, 10) ?? ""}
              />
            </div>
          ) : null}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} defaultValue={member.notes ?? ""} />
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
