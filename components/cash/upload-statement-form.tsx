"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StatementAccountCandidate, StatementParsePreview } from "@/lib/cash/statements/types";
import { MAX_UPLOAD_LABEL, validateUploadFileSize } from "@/lib/upload-limits";
import { StatementImportPreview } from "@/components/cash/statement-import-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";

export function UploadStatementForm({
  accounts,
  preferredAccountId,
  title = "Import Bank Statement",
  description = "Upload a PDF bank statement to extract the closing balance and statement date. Review the parsed details before applying.",
}: {
  accounts: StatementAccountCandidate[];
  preferredAccountId?: string;
  title?: string;
  description?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<StatementParsePreview[] | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPreviews(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const fileInput = form.querySelector<HTMLInputElement>('input[name="files"]');
    const selectedFiles = fileInput?.files;

    if (!selectedFiles || selectedFiles.length === 0) {
      setError("Select at least one bank statement PDF.");
      return;
    }

    for (const file of Array.from(selectedFiles)) {
      const sizeError = validateUploadFileSize(file);
      if (sizeError) {
        setError(sizeError);
        return;
      }
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setError(`${file.name} is not a PDF. Only bank statement PDFs are supported.`);
        return;
      }
    }

    if (preferredAccountId) {
      formData.set("bankAccountId", preferredAccountId);
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/cash/import-statement", {
          method: "POST",
          body: formData,
          credentials: "same-origin",
        });

        const body = (await response.json().catch(() => ({}))) as {
          results?: StatementParsePreview[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(body.error ?? "Failed to parse bank statement.");
        }

        setPreviews(body.results ?? []);
        form.reset();

        try {
          router.refresh();
        } catch {
          // Refresh failures should not hide a successful parse.
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to parse bank statement.";
        if (message.toLowerCase().includes("body exceeded") || message.includes("413")) {
          setError(`File is too large. Maximum upload size is ${MAX_UPLOAD_LABEL}.`);
          return;
        }
        setError(message);
      }
    });
  }

  function handleApplied() {
    setPreviews(null);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="statement-files">Bank statement PDF</Label>
            <Input
              id="statement-files"
              name="files"
              type="file"
              multiple
              required={!previews}
              accept=".pdf,application/pdf"
            />
            <p className="text-xs text-muted-foreground">
              Text-based PDF statements work best. Scanned images may not parse. Maximum{" "}
              {MAX_UPLOAD_LABEL} per file.
            </p>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div>
            <Button type="submit" disabled={pending}>
              {pending ? "Parsing statement..." : "Upload & Parse"}
            </Button>
          </div>
        </form>

        {previews?.length ? (
          <div className="space-y-3 border-t pt-4">
            <p className="text-sm font-medium">Review before applying</p>
            {previews.map((preview) => (
              <StatementImportPreview
                key={preview.importId}
                preview={preview}
                accounts={accounts}
                onApplied={handleApplied}
              />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
