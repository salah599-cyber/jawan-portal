"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordAssetExit } from "@/lib/actions/asset-exits";
import { EXIT_TYPE_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ALLOWED_UPLOAD_ACCEPT } from "@/lib/upload-limits";

function FileSection({ id, name, label }: { id: string; name: string; label: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label} (optional)</Label>
      <Input id={id} name={name} type="file" multiple accept={ALLOWED_UPLOAD_ACCEPT} />
    </div>
  );
}

export function RecordAssetExitForm({
  assetId,
  assetName,
  currency: defaultCurrency,
  acquisitionCost,
  redirectTo,
}: {
  assetId: string;
  assetName: string;
  currency: string;
  acquisitionCost?: string | null;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [exitType, setExitType] = useState("SALE");
  const [currency, setCurrency] = useState(defaultCurrency);

  const showProceeds = exitType === "SALE" || exitType === "LIQUIDATION";
  const showCounterparty = exitType === "SALE" || exitType === "TRANSFER";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("assetId", assetId);
    formData.set("exitType", exitType);
    formData.set("currency", currency);

    startTransition(async () => {
      try {
        await recordAssetExit(formData);
        setExpanded(false);
        if (redirectTo) router.push(redirectTo);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to record exit.");
      }
    });
  }

  if (!expanded) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Record Exit</CardTitle>
          <CardDescription>
            Mark {assetName} as exited with sale/disposal details and supporting documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={() => setExpanded(true)}>Record Exit</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Exit</CardTitle>
        <CardDescription>{assetName}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Exit Type</Label>
            <Select value={exitType} onValueChange={setExitType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(EXIT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="exitDate">Exit Date</Label>
            <Input id="exitDate" name="exitDate" type="date" required />
          </div>
          {showProceeds ? (
            <div className="space-y-2">
              <Label htmlFor="proceeds">Proceeds</Label>
              <Input id="proceeds" name="proceeds" type="number" step="0.01" min="0" required={showProceeds} />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["OMR", "USD", "EUR", "GBP", "AED"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {showCounterparty ? (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="counterparty">Buyer / Transferee</Label>
              <Input id="counterparty" name="counterparty" />
            </div>
          ) : null}
          {acquisitionCost ? (
            <p className="text-sm text-muted-foreground md:col-span-2">
              Acquisition cost on record: {acquisitionCost} {defaultCurrency}
            </p>
          ) : null}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>
          {showProceeds ? (
            <p className="text-sm text-muted-foreground md:col-span-2">
              Proceeds will be held in a suspense account until you assign them to a bank account on
              the Exits page.
            </p>
          ) : null}
          <FileSection id="agreementFiles" name="agreementFiles" label="Sale agreement" />
          <FileSection id="transferFiles" name="transferFiles" label="Transfer deed" />
          <FileSection id="closingFiles" name="closingFiles" label="Closing statement" />
          <FileSection id="otherFiles" name="otherFiles" label="Other documents" />
          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Confirm Exit"}</Button>
            <Button type="button" variant="outline" onClick={() => setExpanded(false)}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
