"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { upsertPeDistribution, deletePeDistribution } from "@/lib/actions/pe-portfolio";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { PE_DISTRIBUTION_TYPE_LABELS } from "@/lib/labels";
import { formatDate, formatMoney } from "@/lib/format";
import type { SerializedPeCompany } from "@/lib/pe/serialize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Distribution = SerializedPeCompany["distributions"][number];

export function PeDistributionsTab({
  company,
  canEdit,
}: {
  company: SerializedPeCompany;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Distribution | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [distributionType, setDistributionType] = useState<string>(editing?.distributionType ?? "DIVIDEND");
  const currency = company.reportingCurrency;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("companyId", company.id);
    formData.set("distributionType", distributionType);
    if (editing?.id) formData.set("id", editing.id);

    startTransition(async () => {
      try {
        await upsertPeDistribution(formData);
        setShowForm(false);
        setEditing(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save distribution.");
      }
    });
  }

  const formOpen = showForm || editing;

  return (
    <div className="space-y-4">
      {canEdit && !formOpen ? (
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
                <Select value={distributionType} onValueChange={setDistributionType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PE_DISTRIBUTION_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amountReporting">Amount ({currency})</Label>
                <Input id="amountReporting" name="amountReporting" required defaultValue={editing?.amountReporting ?? ""} />
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
          <CardTitle>Distributions</CardTitle>
          <CardDescription>
            Total: {formatMoney(company.totals.totalDistributed, currency)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {company.distributions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No distributions recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  {canEdit ? <TableHead className="w-[80px]" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {company.distributions.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{formatDate(d.distributionDate)}</TableCell>
                    <TableCell>{PE_DISTRIBUTION_TYPE_LABELS[d.distributionType] ?? d.distributionType}</TableCell>
                    <TableCell>{formatMoney(d.amountReporting, currency)}</TableCell>
                    {canEdit ? (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setEditing(d)}><Pencil className="size-4" /></Button>
                          <DeleteEntryButton itemId={d.id} itemLabel="distribution" deleteAction={deletePeDistribution} title="Delete distribution?" />
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
