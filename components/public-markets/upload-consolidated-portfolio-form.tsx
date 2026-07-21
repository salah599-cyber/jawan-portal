"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ConsolidatedImportResult } from "@/lib/public-markets/consolidated-import";
import type { ManagedPortfolioRow } from "@/lib/data/managed-portfolios";
import type { PublicBrokerAccountRow } from "@/lib/public-markets/broker-accounts";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";
import { ManagedPortfolioSelect } from "@/components/public-markets/managed-portfolio-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_UPLOAD_LABEL, validateUploadFileSize } from "@/lib/upload-limits";
import { Upload } from "lucide-react";

function formatBrokerAccountLabel(account: PublicBrokerAccountRow) {
  const parts = [account.label || account.broker];
  if (account.accountNumber) parts.push(account.accountNumber);
  return parts.join(" · ");
}

function BrokerAccountPicker({
  label,
  accounts,
  value,
  onValueChange,
  required = false,
  disabled = false,
}: {
  label: string;
  accounts: PublicBrokerAccountRow[];
  value: string;
  onValueChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select
        value={value}
        required={required}
        onChange={(event) => onValueChange(event.target.value)}
        disabled={disabled}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">{required ? "Select account" : "Optional"}</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {formatBrokerAccountLabel(account)}
          </option>
        ))}
      </select>
    </div>
  );
}

export function UploadConsolidatedPortfolioForm({
  entities,
  defaultEntityId,
  portfolios,
  brokerAccounts = [],
}: {
  entities: EntityOption[];
  defaultEntityId?: string;
  portfolios: ManagedPortfolioRow[];
  brokerAccounts?: PublicBrokerAccountRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConsolidatedImportResult | null>(null);
  const [entityId, setEntityId] = useState(defaultEntityId ?? entities[0]?.id ?? "");
  const [managedPortfolioId, setManagedPortfolioId] = useState(portfolios[0]?.id ?? "");
  const [brokerAccountSafra, setBrokerAccountSafra] = useState("");
  const [brokerAccountKristalK18518750, setBrokerAccountKristalK18518750] = useState("");
  const [brokerAccountKristalK15875750, setBrokerAccountKristalK15875750] = useState("");

  const entityBrokerAccounts = useMemo(
    () => brokerAccounts.filter((account) => account.entityId === entityId),
    [brokerAccounts, entityId],
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      setError("Select consolidated_portfolio.xlsx.");
      return;
    }

    const sizeError = validateUploadFileSize(file);
    if (sizeError) {
      setError(sizeError);
      return;
    }

    if (!brokerAccountSafra) {
      setError("Select the Safra Sarasin broker account.");
      return;
    }

    formData.set("importType", "consolidated");
    formData.set("entityId", entityId);
    formData.set("managedPortfolioId", managedPortfolioId);
    formData.set("brokerAccountSafra", brokerAccountSafra);
    formData.set("brokerAccountKristalK18518750", brokerAccountKristalK18518750);
    formData.set("brokerAccountKristalK15875750", brokerAccountKristalK15875750);

    startTransition(async () => {
      try {
        const response = await fetch("/api/portfolio/public-markets/import", {
          method: "POST",
          body: formData,
          credentials: "same-origin",
        });

        const body = (await response.json().catch(() => ({}))) as {
          result?: ConsolidatedImportResult;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(body.error ?? "Failed to import consolidated portfolio.");
        }

        setResult(body.result ?? null);
        form.reset();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to import consolidated portfolio.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Import Consolidated International Portfolio
        </CardTitle>
        <CardDescription>
          Upload consolidated_portfolio.xlsx to import US equities (split by broker account),
          options, structured notes, international stocks, bonds, funds, and cash balances in one
          step. Maximum upload size is {MAX_UPLOAD_LABEL}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Entity</Label>
            <EntitySelect
              entities={entities}
              value={entityId}
              onValueChange={(nextEntityId) => {
                setEntityId(nextEntityId);
                setBrokerAccountSafra("");
                setBrokerAccountKristalK18518750("");
                setBrokerAccountKristalK15875750("");
              }}
              allowAdd={false}
              placeholder="Select entity"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Managed portfolio</Label>
            <ManagedPortfolioSelect
              portfolios={portfolios}
              value={managedPortfolioId}
              onValueChange={setManagedPortfolioId}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <BrokerAccountPicker
              label="Safra Sarasin broker account"
              accounts={entityBrokerAccounts}
              value={brokerAccountSafra}
              onValueChange={setBrokerAccountSafra}
              required
              disabled={!entityId}
            />
          </div>

          <BrokerAccountPicker
            label="Kristal K18518750 account"
            accounts={entityBrokerAccounts}
            value={brokerAccountKristalK18518750}
            onValueChange={setBrokerAccountKristalK18518750}
            disabled={!entityId}
          />

          <BrokerAccountPicker
            label="Kristal K15875750 account"
            accounts={entityBrokerAccounts}
            value={brokerAccountKristalK15875750}
            onValueChange={setBrokerAccountKristalK15875750}
            disabled={!entityId}
          />

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="consolidated-file">Consolidated workbook (.xlsx)</Label>
            <Input id="consolidated-file" name="file" type="file" accept=".xlsx,.xls" required />
          </div>

          <div className="flex items-center gap-2 md:col-span-2">
            <input id="importCash" name="importCash" type="checkbox" defaultChecked className="h-4 w-4" />
            <Label htmlFor="importCash">Import cash balances into Cash Management</Label>
          </div>

          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}

          {result ? (
            <div className="rounded-md border p-3 text-sm md:col-span-2">
              <p className="font-medium">Import complete</p>
              <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                <li>US equities: {result.usEquitiesImported}</li>
                <li>Options: {result.optionsImported}</li>
                <li>Structured notes: {result.structuredNotesImported}</li>
                <li>Bonds: {result.bondsImported}</li>
                <li>International equities: {result.intlEquitiesImported}</li>
                <li>Funds: {result.fundsImported}</li>
                <li>Cash balances: {result.cashBalancesImported}</li>
              </ul>
              {result.warnings.length > 0 ? (
                <ul className="mt-2 list-disc pl-5 text-amber-700">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Importing..." : "Import Consolidated Portfolio"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
