"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertPeExit, deletePeExit } from "@/lib/actions/pe-portfolio";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { PE_EXIT_TYPE_LABELS } from "@/lib/labels";
import { formatDate, formatMoney } from "@/lib/format";
import { formatRoiPct, roiTone } from "@/lib/portfolio/exit-metrics";
import { cn } from "@/lib/utils";
import type { SerializedPeCompany } from "@/lib/pe/serialize";
import { PeDetailField } from "@/components/pe/pe-detail-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PeExitTab({
  company,
  canEdit,
}: {
  company: SerializedPeCompany;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(!company.exit && canEdit);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [exitType, setExitType] = useState<string>(company.exit?.exitType ?? "TRADE_SALE");
  const currency = company.reportingCurrency;
  const exit = company.exit;
  const totalInvested = company.totals.totalInvested;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("companyId", company.id);
    formData.set("exitType", exitType);
    if (exit?.id) formData.set("id", exit.id);

    startTransition(async () => {
      try {
        await upsertPeExit(formData);
        setEditing(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save exit.");
      }
    });
  }

  if (!exit && !canEdit) {
    return <p className="text-sm text-muted-foreground">No exit recorded.</p>;
  }

  if (!exit && editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Record Exit</CardTitle>
          <CardDescription>Document the liquidity event or write-off</CardDescription>
        </CardHeader>
        <CardContent>
          <ExitForm
            currency={currency}
            exitType={exitType}
            setExitType={setExitType}
            onSubmit={handleSubmit}
            pending={pending}
            error={error}
            onCancel={() => setEditing(false)}
            totalInvested={totalInvested}
          />
        </CardContent>
      </Card>
    );
  }

  if (exit && !editing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Exit Summary</CardTitle>
            <CardDescription>{formatDate(exit.exitDate)}</CardDescription>
          </div>
          {canEdit ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
              <DeleteEntryButton
                itemId={exit.id}
                itemLabel="exit record"
                deleteAction={deletePeExit}
                title="Delete exit?"
                description="This will remove the exit record. Company status will not be automatically reverted."
              />
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <PeDetailField label="Exit Type" value={PE_EXIT_TYPE_LABELS[exit.exitType] ?? exit.exitType} />
          <PeDetailField label="Proceeds" value={formatMoney(exit.exitProceedsReporting, currency)} />
          <PeDetailField
            label="Total Invested"
            value={formatMoney(exit.totalInvestedSnapshot, currency)}
          />
          <PeDetailField label="Realised Gain / Loss" value={formatMoney(exit.realisedGainLossReporting, currency)} />
          <PeDetailField
            label="ROI"
            value={
              <span className={cn("font-medium", roiTone(exit.realizedGainPct))}>
                {formatRoiPct(exit.realizedGainPct)}
              </span>
            }
          />
          {exit.notes ? (
            <div className="sm:col-span-2">
              <PeDetailField label="Notes" value={exit.notes} />
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  if (exit && editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Edit Exit</CardTitle>
        </CardHeader>
        <CardContent>
          <ExitForm
            currency={currency}
            exitType={exitType}
            setExitType={setExitType}
            onSubmit={handleSubmit}
            pending={pending}
            error={error}
            onCancel={() => setEditing(false)}
            initial={exit}
            totalInvested={totalInvested}
          />
        </CardContent>
      </Card>
    );
  }

  return canEdit ? (
    <Button onClick={() => setEditing(true)}>Record Exit</Button>
  ) : null;
}

function ExitForm({
  currency,
  exitType,
  setExitType,
  onSubmit,
  pending,
  error,
  onCancel,
  initial,
  totalInvested,
}: {
  currency: string;
  exitType: string;
  setExitType: (v: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  initial?: NonNullable<SerializedPeCompany["exit"]>;
  totalInvested: number;
}) {
  const [proceeds, setProceeds] = useState(initial?.exitProceedsReporting ?? "");
  const previewGain = proceeds ? parseFloat(proceeds) - totalInvested : null;
  const previewRoiPct =
    previewGain != null && totalInvested > 0 ? (previewGain / totalInvested) * 100 : null;

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="exitDate">Exit Date</Label>
        <Input id="exitDate" name="exitDate" type="date" required defaultValue={initial?.exitDate.slice(0, 10)} />
      </div>
      <div className="space-y-2">
        <Label>Exit Type</Label>
        <Select value={exitType} onValueChange={setExitType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(PE_EXIT_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="exitProceedsReporting">Proceeds ({currency})</Label>
        <Input
          id="exitProceedsReporting"
          name="exitProceedsReporting"
          value={proceeds}
          onChange={(e) => setProceeds(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Realised Gain / Loss ({currency})</Label>
        <p className="pt-2 text-sm text-muted-foreground">
          {formatMoney(totalInvested, currency)} invested
          {previewGain != null ? (
            <>
              {" · "}
              <span className={cn("font-medium", roiTone(previewGain))}>
                {formatMoney(previewGain, currency)} ({formatRoiPct(previewRoiPct)})
              </span>
            </>
          ) : null}
        </p>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={initial?.notes ?? ""} />
      </div>
      {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
      <div className="flex gap-2 md:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving..." : initial ? "Update" : "Record Exit"}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
