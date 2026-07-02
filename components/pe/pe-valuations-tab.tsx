"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { upsertPeValuation, deletePeValuation } from "@/lib/actions/pe-portfolio";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { PE_VALUATION_METHOD_LABELS } from "@/lib/labels";
import { formatDate, formatMoney } from "@/lib/format";
import type { SerializedPeCompany } from "@/lib/pe/serialize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Valuation = SerializedPeCompany["valuations"][number];

export function PeValuationsTab({
  company,
  canEdit,
}: {
  company: SerializedPeCompany;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Valuation | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<string>(editing?.method ?? "LAST_ROUND");
  const currency = company.reportingCurrency;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("companyId", company.id);
    formData.set("method", method);
    if (editing?.id) formData.set("id", editing.id);

    startTransition(async () => {
      try {
        await upsertPeValuation(formData);
        setShowForm(false);
        setEditing(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save valuation.");
      }
    });
  }

  const formOpen = showForm || editing;

  return (
    <div className="space-y-4">
      {canEdit && !formOpen ? (
        <Button onClick={() => setShowForm(true)}>Add Valuation</Button>
      ) : null}

      {canEdit && formOpen ? (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Edit Valuation" : "Add Valuation"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="valuationDate">Valuation Date</Label>
                <Input
                  id="valuationDate"
                  name="valuationDate"
                  type="date"
                  required
                  defaultValue={editing?.valuationDate.slice(0, 10)}
                />
              </div>
              <div className="space-y-2">
                <Label>Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PE_VALUATION_METHOD_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="postMoneyReporting">Post-Money ({currency})</Label>
                <Input id="postMoneyReporting" name="postMoneyReporting" defaultValue={editing?.postMoneyReporting ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stakeFairValueReporting">Stake Fair Value ({currency})</Label>
                <Input id="stakeFairValueReporting" name="stakeFairValueReporting" defaultValue={editing?.stakeFairValueReporting ?? ""} />
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
          <CardTitle>Valuation History</CardTitle>
          <CardDescription>Mark-to-market and fair value assessments</CardDescription>
        </CardHeader>
        <CardContent>
          {company.valuations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No valuations recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Post-Money</TableHead>
                  <TableHead>Stake Fair Value</TableHead>
                  {canEdit ? <TableHead className="w-[80px]" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {company.valuations.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{formatDate(v.valuationDate)}</TableCell>
                    <TableCell>{PE_VALUATION_METHOD_LABELS[v.method] ?? v.method}</TableCell>
                    <TableCell>{formatMoney(v.postMoneyReporting, currency)}</TableCell>
                    <TableCell>{formatMoney(v.stakeFairValueReporting, currency)}</TableCell>
                    {canEdit ? (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setEditing(v)}><Pencil className="size-4" /></Button>
                          <DeleteEntryButton itemId={v.id} itemLabel="valuation" deleteAction={deletePeValuation} title="Delete valuation?" />
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
