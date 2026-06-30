"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadLandDocuments } from "@/lib/actions/lands";
import { getLandDocumentTypeLabels } from "@/lib/lands/location";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function UploadLandDocumentsForm({
  landParcelId,
  international = false,
}: {
  landParcelId: string;
  international?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState("KROOKI");
  const docLabels = getLandDocumentTypeLabels(international);
  const fileField = documentType === "KROOKI" ? "krookiFiles" : documentType === "MULKIA" ? "mulkiaFiles" : "otherFiles";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("landParcelId", landParcelId);
    formData.set("documentType", documentType);

    startTransition(async () => {
      try {
        await uploadLandDocuments(formData);
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
                {Object.entries(docLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="land-doc-files">Files</Label>
            <Input id="land-doc-files" name={fileField} type="file" multiple required accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending}>{pending ? "Uploading..." : "Upload"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
