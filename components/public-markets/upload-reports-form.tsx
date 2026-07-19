"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PublicMarket } from "@/lib/generated/prisma/client";
import type { ImportFileResult } from "@/lib/public-markets/types";
import { MARKET_CONFIG } from "@/lib/public-markets/constants";
import { MAX_UPLOAD_LABEL, validateUploadFileSize } from "@/lib/upload-limits";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";
import { DownloadUploadTemplateLink } from "@/components/public-markets/download-upload-template-link";
import { UploadBrokerImportFields } from "@/components/public-markets/upload-broker-import-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ImportFileResult[] | null>(null);
  const [entityId, setEntityId] = useState(defaultEntityId ?? entities[0]?.id ?? "");
  const [brokerAccountId, setBrokerAccountId] = useState("");
  const config = MARKET_CONFIG[market];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResults(null);

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

    if (!brokerAccountId) {
      setError("Select a broker account before importing.");
      return;
    }

    formData.set("entityId", entityId);
    formData.set("brokerAccountId", brokerAccountId);
    formData.set("market", market);

    startTransition(async () => {
      try {
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

        setResults(body.results ?? []);
        setBrokerAccountId("");

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

  const acceptTypes =
    market === "MSX"
      ? ".pdf,.xlsx,.xls,.csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
      : ".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Import Brokerage Reports
        </CardTitle>
        <CardDescription>
          Upload brokerage statements for {config.label}. Each report is parsed automatically and
          merged into your portfolio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="space-y-2">
            <Label>Entity</Label>
            <EntitySelect
              entities={entities}
              value={entityId}
              onValueChange={(id) => {
                setEntityId(id);
                setBrokerAccountId("");
              }}
              allowAdd={false}
              placeholder="Select entity"
            />
          </div>

          <UploadBrokerImportFields
            entityId={entityId}
            brokerAccountId={brokerAccountId}
            onBrokerAccountIdChange={setBrokerAccountId}
          />

          <div className="space-y-2">
            <Label htmlFor="broker-files">Brokerage reports</Label>
            <Input
              id="broker-files"
              name="files"
              type="file"
              multiple
              required
              accept={acceptTypes}
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
            <Button type="submit" disabled={pending}>
              {pending ? "Parsing reports..." : "Upload & Parse Reports"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
