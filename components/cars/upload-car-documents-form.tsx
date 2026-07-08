"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadCarDocuments } from "@/lib/actions/cars";
import { VEHICLE_DOCUMENT_TYPE_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ALLOWED_UPLOAD_ACCEPT } from "@/lib/upload-limits";

export function UploadCarDocumentsForm({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState("MULKIA");
  const fileField =
    documentType === "MULKIA" ? "mulkiaFiles" : documentType === "INSURANCE" ? "insuranceFiles" : "otherFiles";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("vehicleId", vehicleId);
    formData.set("documentType", documentType);

    startTransition(async () => {
      try {
        await uploadCarDocuments(formData);
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
                {Object.entries(VEHICLE_DOCUMENT_TYPE_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="car-doc-files">Files</Label>
            <Input id="car-doc-files" name={fileField} type="file" multiple required accept={ALLOWED_UPLOAD_ACCEPT} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending}>{pending ? "Uploading..." : "Upload"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
