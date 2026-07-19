"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PublicMarket } from "@/lib/generated/prisma/client";
import type { ImportFileResult } from "@/lib/public-markets/types";
import type { ImportPreviewResult } from "@/lib/public-markets/import-preview";
import { formatManualOverlapWarning } from "@/lib/public-markets/import-warnings";
import type { OverlapResolutionStrategy } from "@/lib/public-markets/overlap-resolution";
import { MARKET_CONFIG } from "@/lib/public-markets/constants";
import { MAX_UPLOAD_LABEL, validateUploadFileSize } from "@/lib/upload-limits";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";
import { DownloadUploadTemplateLink } from "@/components/public-markets/download-upload-template-link";
import { ImportOverlapResolutionDialog } from "@/components/public-markets/import-overlap-resolution-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Upload } from "lucide-react";

export function UploadPublicMarketReportsForm({
  entities,
  defaultEntityId,
  market,
}: {
  entities: EntityOption[];
  defaultEntityId?: string;
  market: PublicMarket;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [previewPending, setPreviewPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ImportFileResult[] | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [entityId, setEntityId] = useState(defaultEntityId ?? entities[0]?.id ?? "");
  const [overlapDialogOpen, setOverlapDialogOpen] = useState(false);
  const [overlapStrategy, setOverlapStrategy] = useState<OverlapResolutionStrategy>("keep_manual");
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const previewRequestId = useRef(0);
  const config = MARKET_CONFIG[market];

  async function runPreview(files: FileList | null) {
    if (!files || files.length === 0 || !entityId) {
      setPreview(null);
      return;
    }

    for (const file of Array.from(files)) {
      const sizeError = validateUploadFileSize(file);
      if (sizeError) {
        setPreview(null);
        return;
      }
    }

    const requestId = ++previewRequestId.current;
    setPreviewPending(true);

    try {
      const formData = new FormData();
      formData.set("entityId", entityId);
      formData.set("market", market);
      for (const file of Array.from(files)) {
        formData.append("files", file);
      }

      const response = await fetch("/api/portfolio/public-markets/import/preview", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });

      const body = (await response.json().catch(() => ({}))) as ImportPreviewResult & {
        error?: string;
      };

      if (requestId !== previewRequestId.current) return;

      if (!response.ok) {
        setPreview(null);
        return;
      }

      setPreview(body);
    } catch {
      if (requestId === previewRequestId.current) {
        setPreview(null);
      }
    } finally {
      if (requestId === previewRequestId.current) {
        setPreviewPending(false);
      }
    }
  }

  useEffect(() => {
    setPreview(null);
  }, [entityId, market]);

  async function submitImport(formData: FormData, overlapResolution?: OverlapResolutionStrategy) {
    if (overlapResolution) {
      formData.set("overlapResolution", overlapResolution);
    }

    const response = await fetch("/api/portfolio/public-markets/import", {
      method: "POST",
      body: formData,
      credentials: "same-origin",
    });

    const body = (await response.json().catch(() => ({}))) as {
      results?: ImportFileResult[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(body.error ?? "Failed to import reports.");
    }

    return body.results ?? [];
  }

  function runImport(formData: FormData, overlapResolution?: OverlapResolutionStrategy) {
    setError(null);
    setResults(null);

    startTransition(async () => {
      try {
        const importResults = await submitImport(formData, overlapResolution);
        setResults(importResults);
        setPreview(null);
        setOverlapDialogOpen(false);
        setPendingFormData(null);

        const form = document.getElementById("public-market-import-form") as HTMLFormElement | null;
        form?.reset();

        try {
          router.refresh();
        } catch {
          // Refresh failures should not hide a successful import.
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to import reports.";
        if (message.toLowerCase().includes("body exceeded") || message.includes("413")) {
          setError(`File is too large. Maximum upload size is ${MAX_UPLOAD_LABEL}.`);
          return;
        }
        setError(message);
      }
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);
    const fileInput = form.querySelector<HTMLInputElement>('input[name="files"]');
    const selectedFiles = fileInput?.files;

    if (!entityId) {
      setError("Select an entity for this portfolio.");
      return;
    }

    if (!selectedFiles || selectedFiles.length === 0) {
      setError("Select at least one brokerage report.");
      return;
    }

    for (const file of Array.from(selectedFiles)) {
      const sizeError = validateUploadFileSize(file);
      if (sizeError) {
        setError(sizeError);
        return;
      }
    }

    formData.set("entityId", entityId);
    formData.set("market", market);

    if (preview && preview.manualOverlapDetails.length > 0) {
      setPendingFormData(formData);
      setOverlapStrategy("keep_manual");
      setOverlapDialogOpen(true);
      return;
    }

    runImport(formData);
  }

  const acceptTypes =
    market === "MSX"
      ? ".pdf,.xlsx,.xls,.csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
      : ".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv";

  const manualOverlapWarning = preview ? formatManualOverlapWarning(preview.manualOverlaps) : "";

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Brokerage Reports
          </CardTitle>
          <CardDescription>
            Upload managed portfolio reports for {config.label}. Re-uploading the same broker and
            account replaces prior imported holdings. Manual entries are only changed when you choose
            to replace or merge overlaps.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form id="public-market-import-form" onSubmit={handleSubmit} className="grid gap-4">
            <div className="space-y-2">
              <Label>Entity</Label>
              <EntitySelect
                entities={entities}
                value={entityId}
                onValueChange={setEntityId}
                allowAdd={false}
                placeholder="Select entity"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="broker-files">Brokerage reports</Label>
              <Input
                id="broker-files"
                name="files"
                type="file"
                multiple
                required
                accept={acceptTypes}
                onChange={(event) => {
                  void runPreview(event.target.files);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Select multiple files to import reports from different brokers at once. Maximum{" "}
                {MAX_UPLOAD_LABEL} per file.
                {market === "MSX" ? " Supported: PDF, Excel (.xlsx, .xls)." : " Supported: Excel (.xlsx, .xls, .csv)."}
              </p>
              {market === "MSX" || market === "USA" ? (
                <DownloadUploadTemplateLink market={market} />
              ) : null}
            </div>

            {previewPending ? (
              <p className="text-sm text-muted-foreground">Checking file for overlaps...</p>
            ) : null}

            {preview && !previewPending ? (
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">Import preview</p>
                <ul className="space-y-2 text-sm">
                  {preview.files.map((file) => (
                    <li key={file.fileName} className="rounded-md bg-muted/50 p-2">
                      <p className="font-medium">{file.fileName}</p>
                      <p className="text-muted-foreground">
                        {file.broker}
                        {file.accountNumber ? ` · Account ${file.accountNumber}` : ""}
                      </p>
                      {file.error ? (
                        <p className="text-destructive">{file.error}</p>
                      ) : (
                        <p>
                          {file.holdingsFound} holding{file.holdingsFound === 1 ? "" : "s"} found
                        </p>
                      )}
                      {file.warnings.map((warning) => (
                        <p key={warning} className="text-amber-700">
                          {warning}
                        </p>
                      ))}
                    </li>
                  ))}
                </ul>

                {preview.replaceScopes.some((scope) => scope.existingImportCount > 0) ? (
                  <p className="text-sm text-muted-foreground">
                    {preview.replaceScopes
                      .filter((scope) => scope.existingImportCount > 0)
                      .map((scope) => {
                        const account = scope.accountNumber ? ` / ${scope.accountNumber}` : "";
                        return `${scope.broker}${account}: will replace ${scope.existingImportCount} existing managed holding${scope.existingImportCount === 1 ? "" : "s"}`;
                      })
                      .join(" · ")}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No existing managed holdings matched this broker/account — positions will be added
                    as a new managed slice.
                  </p>
                )}

                {manualOverlapWarning ? (
                  <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{manualOverlapWarning}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            {results ? (
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">Import results</p>
                <ul className="space-y-2 text-sm">
                  {results.map((result) => (
                    <li key={result.fileName} className="rounded-md bg-muted/50 p-2">
                      <p className="font-medium">{result.fileName}</p>
                      <p className="text-muted-foreground">
                        {result.broker}
                        {result.accountNumber ? ` · Account ${result.accountNumber}` : ""}
                      </p>
                      {result.error ? (
                        <p className="text-destructive">{result.error}</p>
                      ) : (
                        <p className="text-green-700">
                          Imported {result.holdingsImported} holding
                          {result.holdingsImported === 1 ? "" : "s"}
                        </p>
                      )}
                      {result.warnings.map((warning) => (
                        <p key={warning} className="text-amber-700">
                          {warning}
                        </p>
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div>
              <Button type="submit" disabled={pending || previewPending}>
                {pending ? "Parsing reports..." : "Upload & Parse Reports"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ImportOverlapResolutionDialog
        open={overlapDialogOpen}
        overlaps={preview?.manualOverlapDetails ?? []}
        strategy={overlapStrategy}
        pending={pending}
        onStrategyChange={setOverlapStrategy}
        onCancel={() => {
          setOverlapDialogOpen(false);
          setPendingFormData(null);
        }}
        onConfirm={() => {
          if (!pendingFormData) return;
          runImport(pendingFormData, overlapStrategy);
        }}
      />
    </>
  );
}
