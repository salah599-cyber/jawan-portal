"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  uploadSuccessionDocuments,
  deleteSuccessionDocument,
  updateSuccessionDocumentStatus,
} from "@/lib/actions/succession";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { FileActionsWithAccess } from "@/components/platform/file-actions-with-access";
import {
  SUCCESSION_DOCUMENT_STATUS_LABELS,
  SUCCESSION_DOCUMENT_TYPE_LABELS,
} from "@/lib/labels";
import { formatDate } from "@/lib/format";
import type { SerializedSuccessionPlan } from "@/lib/succession/serialize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "SIGNED" || status === "FILED") return "default";
  if (status === "MISSING") return "destructive";
  return "outline";
}

export function UploadSuccessionDocumentsForm({
  plan,
  canEdit,
}: {
  plan: SerializedSuccessionPlan;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploadDocId, setUploadDocId] = useState(plan.documents[0]?.id ?? "");
  const [status, setStatus] = useState("SIGNED");

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("planId", plan.id);
    formData.set("documentId", uploadDocId);
    formData.set("status", status);

    startTransition(async () => {
      try {
        await uploadSuccessionDocuments(formData);
        router.refresh();
        (e.target as HTMLFormElement).reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload document.");
      }
    });
  }

  function handleStatusChange(documentId: string, newStatus: string) {
    startTransition(async () => {
      await updateSuccessionDocumentStatus(documentId, newStatus as "DRAFT" | "SIGNED" | "FILED" | "MISSING");
      router.refresh();
    });
  }

  const fileRefs = plan.documents
    .filter((doc) => doc.fileUrl)
    .map((doc) => ({ kind: "succession" as const, fileId: doc.id }));

  return (
    <div className="space-y-4">
      {canEdit ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload Legal Document</CardTitle>
            <CardDescription>Attach a signed or filed document to a document slot</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Document Slot</Label>
                <Select value={uploadDocId} onValueChange={setUploadDocId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {plan.documents.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        {SUCCESSION_DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SUCCESSION_DOCUMENT_STATUS_LABELS).filter(([v]) => v !== "MISSING").map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signedDate">Signed Date</Label>
                <Input id="signedDate" name="signedDate" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jurisdiction">Jurisdiction</Label>
                <Input id="jurisdiction" name="jurisdiction" placeholder="e.g. Oman" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="files">File</Label>
                <Input id="files" name="files" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp" />
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
          <CardTitle>Legal Documents</CardTitle>
          <CardDescription>Status of formal estate planning documentation</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Signed</TableHead>
                {canEdit ? <TableHead className="w-[140px]" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>{SUCCESSION_DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}</TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Select value={doc.status} onValueChange={(v) => handleStatusChange(doc.id, v)}>
                        <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(SUCCESSION_DOCUMENT_STATUS_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={statusVariant(doc.status)}>
                        {SUCCESSION_DOCUMENT_STATUS_LABELS[doc.status] ?? doc.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{doc.fileName ?? "—"}</TableCell>
                  <TableCell>{doc.signedDate ? formatDate(doc.signedDate) : "—"}</TableCell>
                  {canEdit ? (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {doc.fileUrl ? (
                          <FileActionsWithAccess
                            kind="succession"
                            fileId={doc.id}
                            fileName={doc.fileName ?? "document"}
                            files={fileRefs}
                            compact
                          />
                        ) : null}
                        {doc.fileUrl ? (
                          <DeleteEntryButton
                            itemId={doc.id}
                            itemLabel={doc.fileName ?? "document"}
                            deleteAction={deleteSuccessionDocument}
                            title="Remove file?"
                          />
                        ) : null}
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
