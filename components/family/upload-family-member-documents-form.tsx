"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  uploadFamilyMemberDocuments,
} from "@/lib/actions/family-members";
import { FamilyMemberKycDocumentsTable } from "@/components/family/family-member-kyc-documents-table";
import { FAMILY_MEMBER_DOCUMENT_TYPE_LABELS } from "@/lib/labels";
import type { SerializedFamilyMember } from "@/lib/family/serialize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function UploadFamilyMemberDocumentsForm({
  member,
  canEdit,
}: {
  member: SerializedFamilyMember;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState("PASSPORT");

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("memberId", member.id);
    formData.set("documentType", documentType);

    startTransition(async () => {
      try {
        await uploadFamilyMemberDocuments(formData);
        router.refresh();
        (e.target as HTMLFormElement).reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload documents.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {canEdit ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload KYC Documents</CardTitle>
            <CardDescription>Passport, national ID, proof of address, power of attorney, and other identity documents</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FAMILY_MEMBER_DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input id="expiryDate" name="expiryDate" type="date" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="files">Files</Label>
                <Input id="files" name="files" type="file" multiple required accept=".pdf,.jpg,.jpeg,.png,.webp" />
              </div>
              {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
              <div className="md:col-span-2">
                <Button type="submit" disabled={pending}>{pending ? "Uploading..." : "Upload"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <FamilyMemberKycDocumentsTable member={member} canEdit={canEdit} />
    </div>
  );
}
