"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import {
  upsertLpDistribution,
  deleteLpDistribution,
  recallLpDistribution,
} from "@/lib/actions/lp-fund";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { LP_DISTRIBUTION_TYPE_LABELS } from "@/lib/lp/constants";
import { formatDate, formatMoney } from "@/lib/format";
import type { SerializedLpCommitment } from "@/lib/lp/serialize";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Distribution = SerializedLpCommitment["distributions"][number];

export function LpDistributionsTab({
  commitment,
  canEdit,
}: {
  commitment: SerializedLpCommitment;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Distribution | null>(null);
  const [recalling, setRecalling] = useState<Distribution | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [distributionType, setDistributionType] = useState<string>(editing?.distributionType ?? "RETURN_OF_CAPITAL");
  const [isRecallable, setIsRecallable] = useState(editing?.isRecallable ?? false);
  const currency = commitment.commitmentCurrency;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("commitmentId", commitment.id);
    formData.set("distributionType", distributionType);
    formData.set("currency", currency);
    formData.set("isRecallable", isRecallable ? "true" : "false");
    if (editing?.id) formData.set("id", editing.id);

    startTransition(async () => {
      try {
        await upsertLpDistribution(formData);
        setShowForm(false);
        setEditing(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save distribution.");
      }
    });
  }

  function handleRecall(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!recalling) return;
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await recallLpDistribution(recalling.id, formData);
        setRecalling(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to record recall.");
      }
    });
  }

  const formOpen = showForm || editing;
  const sorted = [...commitment.distributions].sort(
    (a, b) => new Date(b.distributionDate).getTime() - new Date(a.distributionDate).getTime(),
  );

  return (
    <div className="space-y-4">
      {canEdit && !formOpen && !recalling ? (
        <Button onClick={() => setShowForm(true)}>Record Distribution</Button>
      ) : null}

      {canEdit && formOpen ? (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Edit Distribution" : "Record Distribution"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="distributionDate">Date</Label>
                <Input
                  id="distributionDate"
                  name="distributionDate"
                  type="date"
                  required
                  defaultValue={editing?.distributionDate.slice(0, 10)}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={distributionType} onValueChange={(v) => setDistributionType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(LP_DISTRIBUTION_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ({currency})</Label>
                <Input id="amount" name="amount" required defaultValue={editing?.amount ?? ""} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  id="isRecallable"
                  type="checkbox"
                  checked={isRecallable}
                  onChange={(e) => setIsRecallable(e.target.checked)}
                  className="size-4 rounded border"
                />
                <Label htmlFor="isRecallable">Recallable distribution</Label>
              </div>
              {isRecallable && editing?.recalledAmount ? (
                <div className="space-y-2">
                  <Label htmlFor="recalledAmount">Recalled to Date</Label>
                  <Input
                    id="recalledAmount"
                    name="recalledAmount"
                    defaultValue={editing.recalledAmount}
                  />
                </div>
              ) : null}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={2} defaultValue={editing?.notes ?? ""} />
              </div>
              {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={pending}>{pending ? "Saving..." : editing ? "Update" : "Record"}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {canEdit && recalling ? (
        <Card>
          <CardHeader>
            <CardTitle>Record Recall</CardTitle>
            <CardDescription>
              Recall against {formatMoney(recalling.amount, currency)} distribution on{" "}
              {formatDate(recalling.distributionDate)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRecall} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="recalledAmount">Recall Amount ({currency})</Label>
                <Input id="recalledAmount" name="recalledAmount" required type="number" step="0.01" min="0" />
              </div>
              {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Record Recall"}</Button>
                <Button type="button" variant="outline" onClick={() => setRecalling(null)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Distributions</CardTitle>
          <CardDescription>
            Total: {formatMoney(commitment.metrics.totalDistributions, currency)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">No distributions recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Recallable</TableHead>
                  {canEdit ? <TableHead className="w-[120px]" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((d) => {
                  const recalled = parseFloat(d.recalledAmount ?? "0");
                  const outstanding = d.isRecallable ? parseFloat(d.amount) - recalled : 0;
                  return (
                    <TableRow key={d.id}>
                      <TableCell>{formatDate(d.distributionDate)}</TableCell>
                      <TableCell>{LP_DISTRIBUTION_TYPE_LABELS[d.distributionType] ?? d.distributionType}</TableCell>
                      <TableCell>{formatMoney(d.amount, currency)}</TableCell>
                      <TableCell>
                        {d.isRecallable ? (
                          <Badge variant="outline">
                            {outstanding > 0
                              ? `${formatMoney(outstanding, currency)} outstanding`
                              : "Fully recalled"}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      {canEdit ? (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {d.isRecallable && outstanding > 0 ? (
                              <Button variant="outline" size="sm" onClick={() => setRecalling(d)}>
                                Recall
                              </Button>
                            ) : null}
                            <Button variant="ghost" size="sm" onClick={() => {
                              setEditing(d);
                              setDistributionType(d.distributionType);
                              setIsRecallable(d.isRecallable);
                            }}>
                              <Pencil className="size-4" />
                            </Button>
                            <DeleteEntryButton
                              itemId={d.id}
                              itemLabel="distribution"
                              deleteAction={deleteLpDistribution}
                              title="Delete distribution?"
                            />
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
