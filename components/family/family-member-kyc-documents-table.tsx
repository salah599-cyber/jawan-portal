"use client";

import { deleteFamilyMemberDocument } from "@/lib/actions/family-members";
import { ReplaceFamilyMemberDocumentDialog } from "@/components/family/replace-family-member-document-dialog";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { FileActionsWithAccess } from "@/components/platform/file-actions-with-access";
import { FAMILY_MEMBER_DOCUMENT_TYPE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import type { SerializedFamilyMember } from "@/lib/family/serialize";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const EXPIRING_SOON_DAYS = 30;

const IDENTITY_DOCUMENT_TYPES = new Set(["PASSPORT", "NATIONAL_ID", "RESIDENCE"]);

function expiryState(expiryDate: string | null): "expired" | "expiring" | null {
  if (!expiryDate) return null;
  const date = new Date(expiryDate);
  const now = new Date();
  if (date.getTime() < now.getTime()) return "expired";
  const soon = new Date(now);
  soon.setDate(soon.getDate() + EXPIRING_SOON_DAYS);
  if (date.getTime() <= soon.getTime()) return "expiring";
  return null;
}

type FamilyDocument = SerializedFamilyMember["documents"][number];

export function FamilyMemberKycDocumentsTable({
  member,
  canEdit,
  identityOnly = false,
  title = "KYC Documents",
  description,
}: {
  member: SerializedFamilyMember;
  canEdit: boolean;
  identityOnly?: boolean;
  title?: string;
  description?: string;
}) {
  const documents = identityOnly
    ? member.documents.filter((doc) => IDENTITY_DOCUMENT_TYPES.has(doc.documentType))
    : member.documents;

  const fileRefs = member.documents.map((doc) => ({ kind: "family-member" as const, fileId: doc.id }));
  const resolvedDescription =
    description ??
    (identityOnly
      ? `${documents.length} identity document${documents.length === 1 ? "" : "s"}`
      : `${documents.length} document${documents.length === 1 ? "" : "s"}`);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{resolvedDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {identityOnly ? "No identity documents uploaded." : "No documents uploaded."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Uploaded</TableHead>
                {canEdit ? <TableHead className="w-[120px]" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  canEdit={canEdit}
                  fileRefs={fileRefs}
                  memberIdNumber={member.idNumber}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function DocumentRow({
  doc,
  canEdit,
  fileRefs,
  memberIdNumber,
}: {
  doc: FamilyDocument;
  canEdit: boolean;
  fileRefs: { kind: "family-member"; fileId: string }[];
  memberIdNumber: string | null;
}) {
  return (
    <TableRow>
      <TableCell>{FAMILY_MEMBER_DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}</TableCell>
      <TableCell className="font-medium">{doc.fileName}</TableCell>
      <TableCell
        className={cn(
          expiryState(doc.expiryDate) === "expired" && "font-medium text-destructive",
          expiryState(doc.expiryDate) === "expiring" && "font-medium text-amber-600",
        )}
      >
        {doc.expiryDate ? formatDate(doc.expiryDate) : "—"}
      </TableCell>
      <TableCell>{formatDate(doc.createdAt)}</TableCell>
      {canEdit ? (
        <TableCell>
          <div className="flex items-center gap-1">
            <FileActionsWithAccess
              kind="family-member"
              fileId={doc.id}
              fileName={doc.fileName}
              files={fileRefs}
              compact
            />
            <ReplaceFamilyMemberDocumentDialog document={doc} memberIdNumber={memberIdNumber} />
            <DeleteEntryButton
              itemId={doc.id}
              itemLabel={doc.fileName}
              deleteAction={deleteFamilyMemberDocument}
              title="Delete document?"
            />
          </div>
        </TableCell>
      ) : null}
    </TableRow>
  );
}
