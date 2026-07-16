"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadPropertyDocuments, deletePropertyDocument } from "@/lib/actions/real-estate";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { FileActions } from "@/components/platform/file-actions";
import { RE_PROPERTY_DOCUMENT_TYPE_LABELS } from "@/lib/labels";
import type { FileAccessContext } from "@/lib/files/download-types";
import { fileRequestKey } from "@/lib/files/download-types";
import { formatDate } from "@/lib/format";
import type { SerializedReProperty } from "@/lib/real-estate/serialize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function ReDocumentsTab({
  property,
  canEdit,
  fileAccess,
}: {
  property: SerializedReProperty;
  canEdit: boolean;
  fileAccess: FileAccessContext;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState("OTHER");
  const [unitId, setUnitId] = useState("none");

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("documentType", documentType);
    formData.set("unitId", unitId === "none" ? "" : unitId);

    startTransition(async () => {
      try {
        await uploadPropertyDocuments(property.id, formData);
        router.refresh();
        (e.target as HTMLFormElement).reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload documents.");
      }
    });
  }

  const docsByType = Object.fromEntries(
    Object.keys(RE_PROPERTY_DOCUMENT_TYPE_LABELS).map((type) => [
      type,
      property.documents.filter((d) => d.documentType === type),
    ]),
  );

  return (
    <div className="space-y-4">
      {canEdit ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload Documents</CardTitle>
            <CardDescription>Title deeds, leases, photos, and other property files</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(RE_PROPERTY_DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit (optional)</Label>
                <Select value={unitId} onValueChange={setUnitId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Property-wide</SelectItem>
                    {property.units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>Unit {unit.unitNumber}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="files">Files</Label>
                <Input
                  id="files"
                  name="files"
                  type="file"
                  multiple
                  required
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date (optional)</Label>
                <Input id="expiryDate" name="expiryDate" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" />
              </div>
              {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
              <div className="md:col-span-2">
                <Button type="submit" disabled={pending}>{pending ? "Uploading..." : "Upload"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>All Documents</CardTitle>
          <CardDescription>{property.documents.length} document(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {property.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents uploaded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {property.documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      {RE_PROPERTY_DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                    </TableCell>
                    <TableCell className="font-medium">{doc.fileName}</TableCell>
                    <TableCell>{formatDate(doc.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <FileActions
                          kind="re-property"
                          fileId={doc.id}
                          fileName={doc.fileName}
                          isSuperAdmin={fileAccess.isSuperAdmin}
                          requestStatus={fileAccess.downloadRequestStatuses[fileRequestKey("re-property", doc.id)]}
                          compact
                        />
                        {canEdit ? (
                          <DeleteEntryButton
                            itemId={doc.id}
                            itemLabel={doc.fileName}
                            deleteAction={deletePropertyDocument}
                            title="Delete document?"
                          />
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {Object.entries(RE_PROPERTY_DOCUMENT_TYPE_LABELS).map(([type, label]) => {
        const docs = docsByType[type] ?? [];
        if (docs.length === 0) return null;
        return (
          <Card key={type}>
            <CardHeader>
              <CardTitle>{label}</CardTitle>
              <CardDescription>{docs.length} file{docs.length === 1 ? "" : "s"}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {docs.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-4 text-sm">
                    <span>{doc.fileName}</span>
                    <FileActions
                      kind="re-property"
                      fileId={doc.id}
                      fileName={doc.fileName}
                      isSuperAdmin={fileAccess.isSuperAdmin}
                      requestStatus={fileAccess.downloadRequestStatuses[fileRequestKey("re-property", doc.id)]}
                      compact
                    />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
