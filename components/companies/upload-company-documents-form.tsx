"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadCompanyDocuments } from "@/lib/actions/companies";
import { COMPANY_DOCUMENT_TYPE_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ALLOWED_UPLOAD_ACCEPT } from "@/lib/upload-limits";

export function UploadCompanyDocumentsForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState("REGISTRATION_COPY");
  const fileField =
    documentType === "REGISTRATION_COPY"
      ? "registrationCopyFiles"
      : documentType === "CHAMBER_COPY"
        ? "chamberCopyFiles"
        : documentType === "FINANCIALS"
          ? "financialsFiles"
          : "otherFiles";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("companyId", companyId);
    formData.set("documentType", documentType);

    startTransition(async () => {
      try {
        await uploadCompanyDocuments(formData);
        form.reset();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload documents.");
      }
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Upload Documents</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="space-y-2">
            <Label>Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(COMPANY_DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-doc-files">Files</Label>
            <Input id="company-doc-files" name={fileField} type="file" multiple required accept={ALLOWED_UPLOAD_ACCEPT} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending}>{pending ? "Uploading..." : "Upload"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
