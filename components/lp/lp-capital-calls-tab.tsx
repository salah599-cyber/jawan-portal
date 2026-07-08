"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import {
  upsertLpCapitalCall,
  deleteLpCapitalCall,
  markLpCapitalCallPaid,
} from "@/lib/actions/lp-fund";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { LP_CAPITAL_CALL_STATUS_LABELS } from "@/lib/lp/constants";
import { resolveCapitalCallStatus } from "@/lib/lp/helpers";
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

type CapitalCall = SerializedLpCommitment["capitalCalls"][number];

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "PAID") return "default";
  if (status === "OVERDUE") return "destructive";
  if (status === "CANCELLED") return "outline";
  return "secondary";
}

export function LpCapitalCallsTab({
  commitment,
  canEdit,
}: {
  commitment: SerializedLpCommitment;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CapitalCall | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>(editing?.status ?? "PENDING");
  const currency = commitment.commitmentCurrency;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("commitmentId", commitment.id);
    formData.set("status", status);
    formData.set("currency", currency);
    if (editing?.id) formData.set("id", editing.id);

    startTransition(async () => {
      try {
        await upsertLpCapitalCall(formData);
        setShowForm(false);
        setEditing(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save capital call.");
      }
    });
  }

  function handleMarkPaid(call: CapitalCall) {
    const formData = new FormData();
    formData.set("paidDate", new Date().toISOString().slice(0, 10));
    startTransition(async () => {
      try {
        await markLpCapitalCallPaid(call.id, formData);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to mark as paid.");
      }
    });
  }

  const formOpen = showForm || editing;
  const sortedCalls = [...commitment.capitalCalls].sort(
    (a, b) => new Date(b.callDate).getTime() - new Date(a.callDate).getTime(),
  );

  return (
    <div className="space-y-4">
      {canEdit && !formOpen ? (
        <Button onClick={() => setShowForm(true)}>Record Capital Call</Button>
      ) : null}

      {canEdit && formOpen ? (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Edit Capital Call" : "Record Capital Call"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="callDate">Call Date</Label>
                <Input
                  id="callDate"
                  name="callDate"
                  type="date"
                  required
                  defaultValue={editing?.callDate.slice(0, 10)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  defaultValue={editing?.dueDate?.slice(0, 10) ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ({currency})</Label>
                <Input id="amount" name="amount" required defaultValue={editing?.amount ?? ""} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(LP_CAPITAL_CALL_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {status === "PAID" ? (
                <div className="space-y-2">
                  <Label htmlFor="paidDate">Paid Date</Label>
                  <Input
                    id="paidDate"
                    name="paidDate"
                    type="date"
                    defaultValue={editing?.paidDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)}
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="reference">Reference</Label>
                <Input id="reference" name="reference" defaultValue={editing?.reference ?? ""} />
              </div>
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

      <Card>
        <CardHeader>
          <CardTitle>Capital Calls</CardTitle>
          <CardDescription>
            Paid-in: {formatMoney(commitment.metrics.paidInCapital, currency)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedCalls.length === 0 ? (
            <p className="text-sm text-muted-foreground">No capital calls recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Call Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid</TableHead>
                  {canEdit ? <TableHead className="w-[120px]" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCalls.map((call) => {
                  const resolved = resolveCapitalCallStatus(
                    call.status,
                    call.dueDate ? new Date(call.dueDate) : null,
                  );
                  return (
                    <TableRow key={call.id}>
                      <TableCell>{formatDate(call.callDate)}</TableCell>
                      <TableCell>{call.dueDate ? formatDate(call.dueDate) : "—"}</TableCell>
                      <TableCell>{formatMoney(call.amount, currency)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(resolved)}>
                          {LP_CAPITAL_CALL_STATUS_LABELS[resolved] ?? resolved}
                        </Badge>
                      </TableCell>
                      <TableCell>{call.paidDate ? formatDate(call.paidDate) : "—"}</TableCell>
                      {canEdit ? (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {resolved !== "PAID" && resolved !== "CANCELLED" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={pending}
                                onClick={() => handleMarkPaid(call)}
                              >
                                Mark Paid
                              </Button>
                            ) : null}
                            <Button variant="ghost" size="sm" onClick={() => { setEditing(call); setStatus(call.status); }}>
                              <Pencil className="size-4" />
                            </Button>
                            <DeleteEntryButton
                              itemId={call.id}
                              itemLabel="capital call"
                              deleteAction={deleteLpCapitalCall}
                              title="Delete capital call?"
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
