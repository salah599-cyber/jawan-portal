"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { upsertPeInvestment, deletePeInvestment } from "@/lib/actions/pe-portfolio";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { PE_INSTRUMENT_LABELS } from "@/lib/labels";
import { formatDate, formatMoney } from "@/lib/format";
import type { SerializedPeCompany } from "@/lib/pe/serialize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Investment = SerializedPeCompany["investments"][number];

function InvestmentForm({
  companyId,
  currency,
  initial,
  onDone,
}: {
  companyId: string;
  currency: string;
  initial?: Investment;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [instrument, setInstrument] = useState<string>(initial?.instrument ?? "ORDINARY_SHARES");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("companyId", companyId);
    formData.set("instrument", instrument);
    if (initial?.id) formData.set("id", initial.id);

    startTransition(async () => {
      try {
        await upsertPeInvestment(formData);
        onDone();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save investment.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="investmentDate">Investment Date</Label>
        <Input
          id="investmentDate"
          name="investmentDate"
          type="date"
          required
          defaultValue={initial?.investmentDate.slice(0, 10)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="roundName">Round</Label>
        <Input id="roundName" name="roundName" placeholder="e.g. Series A" defaultValue={initial?.roundName ?? ""} />
      </div>
      <div className="space-y-2">
        <Label>Instrument</Label>
        <Select value={instrument} onValueChange={setInstrument}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(PE_INSTRUMENT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="amountReporting">Amount ({currency})</Label>
        <Input id="amountReporting" name="amountReporting" defaultValue={initial?.amountReporting ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sharesAcquired">Shares Acquired</Label>
        <Input id="sharesAcquired" name="sharesAcquired" defaultValue={initial?.sharesAcquired ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pricePerShare">Price per Share</Label>
        <Input id="pricePerShare" name="pricePerShare" defaultValue={initial?.pricePerShare ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="preMoneyValuation">Pre-Money Valuation</Label>
        <Input id="preMoneyValuation" name="preMoneyValuation" defaultValue={initial?.preMoneyValuation ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="postMoneyValuation">Post-Money Valuation</Label>
        <Input id="postMoneyValuation" name="postMoneyValuation" defaultValue={initial?.postMoneyValuation ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ownershipPctAtEntry">Ownership % at Entry</Label>
        <Input id="ownershipPctAtEntry" name="ownershipPctAtEntry" defaultValue={initial?.ownershipPctAtEntry ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="reservedAmount">Reserved / Follow-on</Label>
        <Input id="reservedAmount" name="reservedAmount" defaultValue={initial?.reservedAmount ?? ""} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={initial?.notes ?? ""} />
      </div>
      {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
      <div className="flex gap-2 md:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving..." : initial ? "Update" : "Add Investment"}</Button>
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

export function PeInvestmentsTab({
  company,
  canEdit,
}: {
  company: SerializedPeCompany;
  canEdit: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const currency = company.reportingCurrency;

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  return (
    <div className="space-y-4">
      {canEdit && (showForm || editing) ? (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Edit Investment" : "Add Investment"}</CardTitle>
          </CardHeader>
          <CardContent>
            <InvestmentForm
              companyId={company.id}
              currency={currency}
              initial={editing ?? undefined}
              onDone={closeForm}
            />
          </CardContent>
        </Card>
      ) : canEdit ? (
        <Button onClick={() => setShowForm(true)}>Add Investment</Button>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Investment History</CardTitle>
          <CardDescription>
            {company.investments.length} round{company.investments.length === 1 ? "" : "s"} ·{" "}
            {formatMoney(company.totals.totalInvested, currency)} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {company.investments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No investments recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Round</TableHead>
                  <TableHead>Instrument</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Ownership</TableHead>
                  {canEdit ? <TableHead className="w-[80px]" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {company.investments.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{formatDate(inv.investmentDate)}</TableCell>
                    <TableCell>{inv.roundName ?? "—"}</TableCell>
                    <TableCell>{PE_INSTRUMENT_LABELS[inv.instrument] ?? inv.instrument}</TableCell>
                    <TableCell>{formatMoney(inv.amountReporting, currency)}</TableCell>
                    <TableCell>{inv.ownershipPctAtEntry ? `${inv.ownershipPctAtEntry}%` : "—"}</TableCell>
                    {canEdit ? (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setEditing(inv)}>
                            <Pencil className="size-4" />
                          </Button>
                          <DeleteEntryButton
                            itemId={inv.id}
                            itemLabel={inv.roundName ?? "investment"}
                            deleteAction={deletePeInvestment}
                            title="Delete investment?"
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
