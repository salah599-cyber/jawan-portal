"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { upsertLpNavUpdate, deleteLpNavUpdate } from "@/lib/actions/lp-fund";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { LP_NAV_SOURCE_LABELS } from "@/lib/lp/constants";
import { formatDate, formatMoney } from "@/lib/format";
import type { SerializedLpCommitment } from "@/lib/lp/serialize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type NavUpdate = SerializedLpCommitment["navUpdates"][number];

function formatMultiple(value: string | null): string {
  if (!value) return "—";
  const num = parseFloat(value);
  if (Number.isNaN(num)) return "—";
  return `${num.toFixed(2)}x`;
}

function formatIrr(value: string | null): string {
  if (!value) return "—";
  const num = parseFloat(value);
  if (Number.isNaN(num)) return "—";
  return `${(num * 100).toFixed(1)}%`;
}

export function LpNavUpdatesTab({
  commitment,
  canEdit,
}: {
  commitment: SerializedLpCommitment;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<NavUpdate | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string>(editing?.source ?? "GP_REPORT");
  const currency = commitment.commitmentCurrency;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("commitmentId", commitment.id);
    formData.set("source", source);
    formData.set("currency", currency);
    if (editing?.id) formData.set("id", editing.id);

    startTransition(async () => {
      try {
        await upsertLpNavUpdate(formData);
        setShowForm(false);
        setEditing(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save NAV update.");
      }
    });
  }

  const formOpen = showForm || editing;
  const sorted = [...commitment.navUpdates].sort(
    (a, b) => new Date(b.asOfDate).getTime() - new Date(a.asOfDate).getTime(),
  );

  return (
    <div className="space-y-4">
      {canEdit && !formOpen ? (
        <Button onClick={() => setShowForm(true)}>Add NAV Update</Button>
      ) : null}

      {canEdit && formOpen ? (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Edit NAV Update" : "Add NAV Update"}</CardTitle>
            <CardDescription>GP-reported net asset value and optional performance overrides</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="asOfDate">As Of Date</Label>
                <Input
                  id="asOfDate"
                  name="asOfDate"
                  type="date"
                  required
                  defaultValue={editing?.asOfDate.slice(0, 10)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nav">NAV ({currency})</Label>
                <Input id="nav" name="nav" required defaultValue={editing?.nav ?? ""} />
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={source} onValueChange={(v) => setSource(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(LP_NAV_SOURCE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gpReportedTvpi">GP Reported TVPI</Label>
                <Input
                  id="gpReportedTvpi"
                  name="gpReportedTvpi"
                  type="number"
                  step="0.0001"
                  placeholder="e.g. 1.45"
                  defaultValue={editing?.gpReportedTvpi ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gpReportedIrr">GP Reported IRR (decimal)</Label>
                <Input
                  id="gpReportedIrr"
                  name="gpReportedIrr"
                  type="number"
                  step="0.0001"
                  placeholder="e.g. 0.12 for 12%"
                  defaultValue={editing?.gpReportedIrr ?? ""}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={2} defaultValue={editing?.notes ?? ""} />
              </div>
              {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={pending}>{pending ? "Saving..." : editing ? "Update" : "Add"}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>NAV Timeline</CardTitle>
          <CardDescription>
            Latest:{" "}
            {commitment.metrics.latestNav != null
              ? formatMoney(commitment.metrics.latestNav, currency)
              : "—"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">No NAV updates recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>As Of</TableHead>
                  <TableHead>NAV</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>GP TVPI</TableHead>
                  <TableHead>GP IRR</TableHead>
                  {canEdit ? <TableHead className="w-[80px]" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((nav) => (
                  <TableRow key={nav.id}>
                    <TableCell>{formatDate(nav.asOfDate)}</TableCell>
                    <TableCell>{formatMoney(nav.nav, currency)}</TableCell>
                    <TableCell>{LP_NAV_SOURCE_LABELS[nav.source] ?? nav.source}</TableCell>
                    <TableCell>{formatMultiple(nav.gpReportedTvpi)}</TableCell>
                    <TableCell>{formatIrr(nav.gpReportedIrr)}</TableCell>
                    {canEdit ? (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditing(nav); setSource(nav.source); }}>
                            <Pencil className="size-4" />
                          </Button>
                          <DeleteEntryButton
                            itemId={nav.id}
                            itemLabel="NAV update"
                            deleteAction={deleteLpNavUpdate}
                            title="Delete NAV update?"
                          />
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
