"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cleanupFailedDocumentUpload, saveDocumentMetadata } from "@/lib/actions/documents";
import { ALLOWED_UPLOAD_ACCEPT, MAX_UPLOAD_LABEL, validateUploadFile } from "@/lib/upload-limits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";
import {
  DocumentCategorySelect,
  type DocumentCategoryOption,
} from "@/components/documents/document-category-select";

export function UploadDocumentForm({
  entities,
  categories,
  canAddCategory = true,
  existingNames = [],
}: {
  entities: EntityOption[];
  categories: DocumentCategoryOption[];
  canAddCategory?: boolean;
  existingNames?: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [categoryList, setCategoryList] = useState(categories);
  const existingNameSet = useMemo(
    () => new Set(existingNames.map((n) => n.trim().toLowerCase())),
    [existingNames],
  );
  const defaultCategoryId = useMemo(
    () =>
      categoryList.find((c) => c.name === "Corporate")?.id ??
      categoryList[0]?.id ??
      "",
    [categoryList],
  );
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [entityId, setEntityId] = useState<string>("none");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("A file is required.");
      return;
    }

    const fileError = validateUploadFile(file);
    if (fileError) {
      setError(fileError);
      return;
    }

    const name = String(formData.get("name") ?? "").trim();
    const expiryDateRaw = String(formData.get("expiryDate") ?? "").trim();
    const entityIdValue = entityId === "none" ? "" : entityId;

    if (!name) {
      setError("Document name is required.");
      return;
    }
    if (!categoryId) {
      setError("Category is required.");
      return;
    }

    startTransition(async () => {
      let uploadedUrl: string | undefined;
      try {
        const uploadData = new FormData();
        uploadData.set("file", file);

        const uploadRes = await fetch("/api/documents/upload", {
          method: "POST",
          body: uploadData,
          credentials: "same-origin",
        });

        const uploadBody = (await uploadRes.json().catch(() => ({}))) as {
          url?: string;
          fileName?: string;
          mimeType?: string;
          fileSize?: number;
          error?: string;
        };

        if (!uploadRes.ok || !uploadBody.url) {
          throw new Error(uploadBody.error ?? "Failed to upload file to storage.");
        }
        uploadedUrl = uploadBody.url;

        const doc = await saveDocumentMetadata({
          name,
          categoryId,
          fileName: uploadBody.fileName ?? file.name,
          fileUrl: uploadBody.url,
          mimeType: uploadBody.mimeType ?? (file.type || "application/octet-stream"),
          fileSize: uploadBody.fileSize ?? file.size,
          expiryDate: expiryDateRaw || undefined,
          entityId: entityIdValue || undefined,
        });

        toast.success("Uploaded " + doc.name);
        form.reset();
        setEntityId("none");
        setDuplicateWarning(null);
        router.refresh();
      } catch (err) {
        if (uploadedUrl) {
          cleanupFailedDocumentUpload(uploadedUrl).catch(() => {});
        }
        const message = err instanceof Error ? err.message : "Failed to upload document.";
        const friendlyMessage =
          message.toLowerCase().includes("body exceeded") || message.includes("413")
            ? `File is too large. Maximum upload size is ${MAX_UPLOAD_LABEL}.`
            : message;
        setError(friendlyMessage);
        toast.error(friendlyMessage);
      }
    });
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.trim().toLowerCase();
    setDuplicateWarning(
      value && existingNameSet.has(value)
        ? "A document with this name already exists. You can still upload — it will be stored as a separate record."
        : null,
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Document</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="file">File</Label>
            <Input
              id="file"
              name="file"
              type="file"
              required
              accept={ALLOWED_UPLOAD_ACCEPT}
            />
            <p className="text-xs text-muted-foreground">Maximum file size: {MAX_UPLOAD_LABEL}</p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Document title" onChange={handleNameChange} />
            {duplicateWarning ? <p className="text-xs text-amber-600">{duplicateWarning}</p> : null}
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <DocumentCategorySelect
              categories={categoryList}
              value={categoryId}
              onValueChange={setCategoryId}
              canAdd={canAddCategory}
              onCategoryAdded={(category) => {
                setCategoryList((current) => {
                  if (current.some((item) => item.id === category.id)) return current;
                  return [...current, category].sort((a, b) => a.name.localeCompare(b.name));
                });
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiryDate">Expiry Date (optional)</Label>
            <Input id="expiryDate" name="expiryDate" type="date" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Entity (optional)</Label>
            <EntitySelect
              entities={entities}
              value={entityId}
              onValueChange={setEntityId}
              allowNone
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive md:col-span-2">{error}</p>
          ) : null}

          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Uploading..." : "Upload Document"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
