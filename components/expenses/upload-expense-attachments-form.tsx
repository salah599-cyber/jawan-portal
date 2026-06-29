"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadExpenseAttachments } from "@/lib/actions/expenses";
import { EXPENSE_ATTACHMENT_TYPE_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function UploadExpenseAttachmentsForm({ expenseId }: { expenseId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [attachmentType, setAttachmentType] = useState("INVOICE");
  const fileField =
    attachmentType === "INVOICE"
      ? "invoiceFiles"
      : attachmentType === "PAYMENT_SLIP"
        ? "paymentSlipFiles"
        : attachmentType === "CHEQUE_COPY"
          ? "chequeFiles"
          : "otherFiles";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("expenseId", expenseId);
    formData.set("attachmentType", attachmentType);

    startTransition(async () => {
      try {
        await uploadExpenseAttachments(formData);
        form.reset();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload attachments.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Documents</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="space-y-2">
            <Label>Document Type</Label>
            <Select value={attachmentType} onValueChange={setAttachmentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EXPENSE_ATTACHMENT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-attachment-files">Files</Label>
            <Input
              id="expense-attachment-files"
              name={fileField}
              type="file"
              multiple
              required
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Uploading..." : "Upload"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
