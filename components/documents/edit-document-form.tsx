"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { uploadDocumentVaultClient } from "@/lib/blob/client-upload";
import {
  cleanupFailedDocumentUpload,
  replaceDocument,
  updateDocument,
  type UpdateDocumentInput,
} from "@/lib/actions/documents";
import { FileActionsWithAccess } from "@/components/platform/file-actions-with-access";
import { formatDateInput } from "@/lib/format";
import { ALLOWED_UPLOAD_ACCEPT, MAX_UPLOAD_LABEL, validateUploadFile } from "@/lib/upload-limits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EntitySelect } from "@/components/platform/entity-select";
import {
  DocumentCategorySelect,
  type DocumentCategoryOption,
} from "@/components/documents/document-category-select";

type EntityOption = { id: string; name: string };

type DocumentRecord = {
  id: string;
  name: string;
  fileName: string;
  fileUrl: string;
  categoryId: string;
  expiryDate: Date | null;
  entityId: string | null;
};

export function EditDocumentForm({
  document,
  entities,
  categories,
  currentUserId,
  canAddCategory = true,
}: {
  document: DocumentRecord;
  entities: EntityOption[];
  categories: DocumentCategoryOption[];
  currentUserId: string;
  canAddCategory?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [replacePending, startReplaceTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [replaceError, setReplaceError] = useState<string | null>(null);
  const [categoryList, setCategoryList] = useState(categories);
  const [categoryId, setCategoryId] = useState(document.categoryId);
  const [entityId, setEntityId] = useState(document.entityId ?? "none");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);

    const input: UpdateDocumentInput = {
      name: String(form.get("name") ?? ""),
      categoryId,
      expiryDate: String(form.get("expiryDate") ?? ""),
      entityId: entityId === "none" ? undefined : entityId,
    };

    startTransition(async () => {
      try {
        await updateDocument(document.id, input);
        router.push("/documents");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update document.");
      }
    });
  }

  function handleReplace(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setReplaceError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setReplaceError("A replacement file is required.");
      return;
    }

    const fileError = validateUploadFile(file);
    if (fileError) {
      setReplaceError(fileError);
      return;
    }

    const expiryDateRaw = String(formData.get("replaceExpiryDate") ?? "").trim();

    startReplaceTransition(async () => {
      let uploadedUrl: string | undefined;
      try {
        const uploaded = await uploadDocumentVaultClient(file, currentUserId);
        uploadedUrl = uploaded.fileUrl;

        await replaceDocument(document.id, {
          fileName: uploaded.fileName,
          fileUrl: uploaded.fileUrl,
          mimeType: uploaded.mimeType,
          fileSize: uploaded.fileSize,
          expiryDate: expiryDateRaw || undefined,
        });

        toast.success("Document file replaced.");
        form.reset();
        router.refresh();
      } catch (err) {
        if (uploadedUrl) {
          cleanupFailedDocumentUpload(uploadedUrl).catch(() => {});
        }
        const message = err instanceof Error ? err.message : "Failed to replace document.";
        const friendlyMessage =
          message.toLowerCase().includes("body exceeded") || message.includes("413")
            ? `File is too large. Maximum upload size is ${MAX_UPLOAD_LABEL}.`
            : message;
        setReplaceError(friendlyMessage);
        toast.error(friendlyMessage);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Edit Document</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2">
            <span>File: {document.fileName}</span>
            <FileActionsWithAccess
              kind="document"
              fileId={document.id}
              fileName={document.fileName}
              files={[{ kind: "document", fileId: document.id }]}
              compact
            />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required defaultValue={document.name} />
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
              <Input id="expiryDate" name="expiryDate" type="date" defaultValue={formatDateInput(document.expiryDate)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Entity (optional)</Label>
              <EntitySelect entities={entities} value={entityId} onValueChange={setEntityId} allowNone />
            </div>
            {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save Changes"}</Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Replace File</CardTitle>
          <CardDescription>
            Upload a new file to replace the current document. The same record is kept so links and history remain intact.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReplace} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="file">New File</Label>
              <Input
                id="file"
                name="file"
                type="file"
                required
                accept={ALLOWED_UPLOAD_ACCEPT}
              />
              <p className="text-xs text-muted-foreground">Maximum file size: {MAX_UPLOAD_LABEL}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="replaceExpiryDate">New Expiry Date (optional)</Label>
              <Input
                id="replaceExpiryDate"
                name="replaceExpiryDate"
                type="date"
                defaultValue={formatDateInput(document.expiryDate)}
              />
            </div>
            {replaceError ? <p className="text-sm text-destructive md:col-span-2">{replaceError}</p> : null}
            <div className="md:col-span-2">
              <Button type="submit" variant="secondary" disabled={replacePending}>
                {replacePending ? "Replacing..." : "Replace File"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
