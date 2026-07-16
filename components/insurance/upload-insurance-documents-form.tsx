"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadInsuranceDocuments, deleteInsuranceDocument } from "@/lib/actions/insurance";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { FileActionsWithAccess } from "@/components/platform/file-actions-with-access";
import { INSURANCE_DOCUMENT_TYPE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import type { SerializedInsurancePolicy } from "@/lib/insurance/serialize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function UploadInsuranceDocumentsForm({
  policy,
  canEdit,
}: {
  policy: SerializedInsurancePolicy;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState("POLICY_SCHEDULE");

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("policyId", policy.id);
    formData.set("documentType", documentType);

    startTransition(async () => {
      try {
        await uploadInsuranceDocuments(formData);
        router.refresh();
        (e.target as HTMLFormElement).reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload documents.");
      }
    });
  }

  const fileRefs = policy.documents.map((doc) => ({ kind: "insurance" as const, fileId: doc.id }));

  return (
    <div className="space-y-4">
      {canEdit ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload Documents</CardTitle>
            <CardDescription>Policy schedules, certificates, endorsements, and renewal notices</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(INSURANCE_DOCUMENT_TYPE_LABELS).map(([value, label]) => (
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
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
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
          <CardTitle>Policy Documents</CardTitle>
          <CardDescription>{policy.documents.length} document{policy.documents.length === 1 ? "" : "s"}</CardDescription>
        </CardHeader>
        <CardContent>
          {policy.documents.length === 0 ? (
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
                {policy.documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>{INSURANCE_DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}</TableCell>
                    <TableCell className="font-medium">{doc.fileName}</TableCell>
                    <TableCell>{formatDate(doc.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <FileActionsWithAccess
                          kind="insurance"
                          fileId={doc.id}
                          fileName={doc.fileName}
                          files={fileRefs}
                          compact
                        />
                        {canEdit ? (
                          <DeleteEntryButton
                            itemId={doc.id}
                            itemLabel={doc.fileName}
                            deleteAction={deleteInsuranceDocument}
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
    </div>
  );
}
