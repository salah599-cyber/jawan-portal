"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { replaceFamilyMemberDocument } from "@/lib/actions/family-members";
import { FAMILY_MEMBER_DOCUMENT_TYPE_LABELS } from "@/lib/labels";
import { formatDateInput } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const IDENTITY_DOCUMENT_TYPES = new Set(["PASSPORT", "NATIONAL_ID", "RESIDENCE"]);

type FamilyDocumentRow = {
  id: string;
  documentType: string;
  fileName: string;
  expiryDate: string | null;
};

export function ReplaceFamilyMemberDocumentDialog({
  document: doc,
  memberIdNumber,
}: {
  document: FamilyDocumentRow;
  memberIdNumber: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isIdentityDoc = IDENTITY_DOCUMENT_TYPES.has(doc.documentType);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("documentId", doc.id);

    startTransition(async () => {
      try {
        await replaceFamilyMemberDocument(formData);
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to replace document.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" aria-label="Replace document">
          <RefreshCw className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Replace Document</DialogTitle>
          <DialogDescription>
            Replace {FAMILY_MEMBER_DOCUMENT_TYPE_LABELS[doc.documentType as keyof typeof FAMILY_MEMBER_DOCUMENT_TYPE_LABELS] ?? doc.documentType}: {doc.fileName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor={`replace-file-${doc.id}`}>New File</Label>
            <Input
              id={`replace-file-${doc.id}`}
              name="file"
              type="file"
              required
              accept=".pdf,.jpg,.jpeg,.png,.webp"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`replace-expiry-${doc.id}`}>Expiry Date</Label>
            <Input
              id={`replace-expiry-${doc.id}`}
              name="expiryDate"
              type="date"
              defaultValue={formatDateInput(doc.expiryDate ? new Date(doc.expiryDate) : null)}
            />
          </div>
          {isIdentityDoc ? (
            <div className="space-y-2">
              <Label htmlFor={`replace-id-number-${doc.id}`}>ID Number (optional)</Label>
              <Input
                id={`replace-id-number-${doc.id}`}
                name="idNumber"
                defaultValue={memberIdNumber ?? ""}
                placeholder="Updates member ID number if provided"
              />
            </div>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Replacing..." : "Replace"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
