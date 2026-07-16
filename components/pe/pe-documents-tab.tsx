"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadPeDocuments, deletePeDocument } from "@/lib/actions/pe-portfolio";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { FileActions } from "@/components/platform/file-actions";
import { PE_DOCUMENT_TYPE_LABELS } from "@/lib/labels";
import type { FileAccessContext } from "@/lib/files/download-types";
import { fileRequestKey } from "@/lib/files/download-types";
import { formatDate } from "@/lib/format";
import type { SerializedPeCompany } from "@/lib/pe/serialize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function PeDocumentsTab({
  company,
  canEdit,
  fileAccess,
}: {
  company: SerializedPeCompany;
  canEdit: boolean;
  fileAccess: FileAccessContext;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState("OTHER");

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("companyId", company.id);
    formData.set("documentType", documentType);

    startTransition(async () => {
      try {
        await uploadPeDocuments(formData);
        router.refresh();
        (e.target as HTMLFormElement).reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload documents.");
      }
    });
  }

  const docsByType = Object.fromEntries(
    Object.keys(PE_DOCUMENT_TYPE_LABELS).map((type) => [
      type,
      company.documents.filter((d) => d.documentType === type),
    ]),
  );

  return (
    <div className="space-y-4">
      {canEdit ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload Documents</CardTitle>
            <CardDescription>SHA, term sheets, financials, and other deal documents</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PE_DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
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
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                />
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
          <CardDescription>{company.documents.length} document{company.documents.length === 1 ? "" : "s"}</CardDescription>
        </CardHeader>
        <CardContent>
          {company.documents.length === 0 ? (
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
                {company.documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>{PE_DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}</TableCell>
                    <TableCell className="font-medium">{doc.fileName}</TableCell>
                    <TableCell>{formatDate(doc.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <FileActions
                          kind="pe-company"
                          fileId={doc.id}
                          fileName={doc.fileName}
                          isSuperAdmin={fileAccess.isSuperAdmin}
                          requestStatus={fileAccess.downloadRequestStatuses[fileRequestKey("pe-company", doc.id)]}
                          compact
                        />
                        {canEdit ? (
                          <DeleteEntryButton
                            itemId={doc.id}
                            itemLabel={doc.fileName}
                            deleteAction={deletePeDocument}
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

      {Object.entries(PE_DOCUMENT_TYPE_LABELS).map(([type, label]) => {
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
                      kind="pe-company"
                      fileId={doc.id}
                      fileName={doc.fileName}
                      isSuperAdmin={fileAccess.isSuperAdmin}
                      requestStatus={fileAccess.downloadRequestStatuses[fileRequestKey("pe-company", doc.id)]}
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
