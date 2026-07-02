"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadAssetDocuments } from "@/lib/actions/assets";
import { ASSET_DOCUMENT_TYPE_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function UploadAssetDocumentsForm({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState("PHOTO");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("assetId", assetId);
    formData.set("documentType", documentType);
    if (documentType === "PHOTO") {
      formData.set("setPrimary", "true");
    }

    startTransition(async () => {
      try {
        await uploadAssetDocuments(formData);
        form.reset();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload documents.");
      }
    });
  }

  const accept =
    documentType === "PHOTO"
      ? ".jpg,.jpeg,.png,.webp,.heic"
      : ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.heic";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Files</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="space-y-2">
            <Label>Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ASSET_DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="asset-doc-files">Files</Label>
            <Input
              id="asset-doc-files"
              name="files"
              type="file"
              multiple
              required
              accept={accept}
            />
          </div>
          {documentType !== "PHOTO" ? (
            <div className="space-y-2">
              <Label htmlFor="asset-doc-notes">Notes (optional)</Label>
              <Input id="asset-doc-notes" name="notes" placeholder="Short description" />
            </div>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Uploading..." : "Upload"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
