"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadLoanDocuments } from "@/lib/actions/loans";
import { LOAN_DOCUMENT_TYPE_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function UploadLoanDocumentsForm({ liabilityId }: { liabilityId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState("LOAN_AGREEMENT");
  const fileField =
    documentType === "LOAN_AGREEMENT"
      ? "agreementFiles"
      : documentType === "PAYMENT_SCHEDULE"
        ? "scheduleFiles"
        : documentType === "STATEMENT"
          ? "statementFiles"
          : "otherFiles";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("liabilityId", liabilityId);
    formData.set("documentType", documentType);

    startTransition(async () => {
      try {
        await uploadLoanDocuments(formData);
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
                {Object.entries(LOAN_DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="loan-doc-files">Files</Label>
            <Input id="loan-doc-files" name={fileField} type="file" multiple required accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending}>{pending ? "Uploading..." : "Upload"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
