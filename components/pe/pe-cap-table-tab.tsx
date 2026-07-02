"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import {
  upsertPeShareholder,
  deletePeShareholder,
  upsertPeCapTableRound,
  deletePeCapTableRound,
  upsertPeDilutionEvent,
  deletePeDilutionEvent,
} from "@/lib/actions/pe-portfolio";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import {
  PE_DILUTION_EVENT_LABELS,
  PE_INSTRUMENT_LABELS,
  PE_SHAREHOLDER_TYPE_LABELS,
} from "@/lib/labels";
import { formatDate, formatMoney } from "@/lib/format";
import type { SerializedPeCompany } from "@/lib/pe/serialize";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Shareholder = SerializedPeCompany["shareholders"][number];
type Round = SerializedPeCompany["capTableRounds"][number];
type Dilution = SerializedPeCompany["dilutionEvents"][number];

export function PeCapTableTab({
  company,
  canEdit,
}: {
  company: SerializedPeCompany;
  canEdit: boolean;
}) {
  const [section, setSection] = useState<"shareholder" | "round" | "dilution" | null>(null);
  const [editingShareholder, setEditingShareholder] = useState<Shareholder | null>(null);
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [editingDilution, setEditingDilution] = useState<Dilution | null>(null);
  const currency = company.reportingCurrency;

  return (
    <div className="space-y-6">
      <ShareholdersSection
        company={company}
        canEdit={canEdit}
        section={section}
        setSection={setSection}
        editing={editingShareholder}
        setEditing={setEditingShareholder}
      />
      <RoundsSection
        company={company}
        canEdit={canEdit}
        currency={currency}
        section={section}
        setSection={setSection}
        editing={editingRound}
        setEditing={setEditingRound}
      />
      <DilutionSection
        company={company}
        canEdit={canEdit}
        section={section}
        setSection={setSection}
        editing={editingDilution}
        setEditing={setEditingDilution}
      />
    </div>
  );
}

function ShareholdersSection({
  company,
  canEdit,
  section,
  setSection,
  editing,
  setEditing,
}: {
  company: SerializedPeCompany;
  canEdit: boolean;
  section: string | null;
  setSection: (v: "shareholder" | "round" | "dilution" | null) => void;
  editing: Shareholder | null;
  setEditing: (v: Shareholder | null) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [shareholderType, setShareholderType] = useState<string>(editing?.shareholderType ?? "OTHER");
  const showForm = section === "shareholder" || editing;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("companyId", company.id);
    formData.set("shareholderType", shareholderType);
    if (editing?.id) formData.set("id", editing.id);

    startTransition(async () => {
      try {
        await upsertPeShareholder(formData);
        setSection(null);
        setEditing(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save shareholder.");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Shareholders</CardTitle>
          <CardDescription>Cap table ownership breakdown</CardDescription>
        </div>
        {canEdit && !showForm ? (
          <Button size="sm" onClick={() => setSection("shareholder")}>Add Shareholder</Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {canEdit && showForm ? (
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 rounded-lg border p-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="shareholderName">Name</Label>
              <Input id="shareholderName" name="shareholderName" required defaultValue={editing?.shareholderName ?? ""} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={shareholderType} onValueChange={setShareholderType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PE_SHAREHOLDER_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isOurStake" defaultChecked={editing?.isOurStake} />
                Our stake
              </label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownershipPct">Ownership %</Label>
              <Input id="ownershipPct" name="ownershipPct" defaultValue={editing?.ownershipPct ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sharesHeld">Shares Held</Label>
              <Input id="sharesHeld" name="sharesHeld" defaultValue={editing?.sharesHeld ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shareClass">Share Class</Label>
              <Input id="shareClass" name="shareClass" defaultValue={editing?.shareClass ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roundEntered">Round Entered</Label>
              <Input id="roundEntered" name="roundEntered" defaultValue={editing?.roundEntered ?? ""} />
            </div>
            {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" disabled={pending}>{pending ? "Saving..." : editing ? "Update" : "Add"}</Button>
              <Button type="button" variant="outline" onClick={() => { setSection(null); setEditing(null); }}>Cancel</Button>
            </div>
          </form>
        ) : null}

        {company.shareholders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No shareholders recorded.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Ownership</TableHead>
                <TableHead>Shares</TableHead>
                {canEdit ? <TableHead className="w-[80px]" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {company.shareholders.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    {s.shareholderName}
                    {s.isOurStake ? <Badge className="ml-2" variant="secondary">Ours</Badge> : null}
                  </TableCell>
                  <TableCell>{PE_SHAREHOLDER_TYPE_LABELS[s.shareholderType] ?? s.shareholderType}</TableCell>
                  <TableCell>{s.ownershipPct ? `${s.ownershipPct}%` : "—"}</TableCell>
                  <TableCell>{s.sharesHeld ?? "—"}</TableCell>
                  {canEdit ? (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(s)}><Pencil className="size-4" /></Button>
                        <DeleteEntryButton itemId={s.id} itemLabel={s.shareholderName} deleteAction={deletePeShareholder} title="Delete shareholder?" />
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
  );
}

function RoundsSection({
  company,
  canEdit,
  currency,
  section,
  setSection,
  editing,
  setEditing,
}: {
  company: SerializedPeCompany;
  canEdit: boolean;
  currency: string;
  section: string | null;
  setSection: (v: "shareholder" | "round" | "dilution" | null) => void;
  editing: Round | null;
  setEditing: (v: Round | null) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [instrument, setInstrument] = useState<string>(editing?.instrument ?? "ORDINARY_SHARES");
  const showForm = section === "round" || editing;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("companyId", company.id);
    formData.set("instrument", instrument);
    if (editing?.id) formData.set("id", editing.id);

    startTransition(async () => {
      try {
        await upsertPeCapTableRound(formData);
        setSection(null);
        setEditing(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save round.");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Funding Rounds</CardTitle>
          <CardDescription>Historical financing rounds</CardDescription>
        </div>
        {canEdit && !showForm ? (
          <Button size="sm" onClick={() => setSection("round")}>Add Round</Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {canEdit && showForm ? (
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 rounded-lg border p-4">
            <div className="space-y-2">
              <Label htmlFor="roundName">Round Name</Label>
              <Input id="roundName" name="roundName" required defaultValue={editing?.roundName ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roundDate">Date</Label>
              <Input id="roundDate" name="roundDate" type="date" defaultValue={editing?.roundDate?.slice(0, 10) ?? ""} />
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
              <Label htmlFor="amountRaised">Amount Raised ({currency})</Label>
              <Input id="amountRaised" name="amountRaised" defaultValue={editing?.amountRaised ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preMoneyValuation">Pre-Money</Label>
              <Input id="preMoneyValuation" name="preMoneyValuation" defaultValue={editing?.preMoneyValuation ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postMoneyValuation">Post-Money</Label>
              <Input id="postMoneyValuation" name="postMoneyValuation" defaultValue={editing?.postMoneyValuation ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadInvestor">Lead Investor</Label>
              <Input id="leadInvestor" name="leadInvestor" defaultValue={editing?.leadInvestor ?? ""} />
            </div>
            {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" disabled={pending}>{pending ? "Saving..." : editing ? "Update" : "Add"}</Button>
              <Button type="button" variant="outline" onClick={() => { setSection(null); setEditing(null); }}>Cancel</Button>
            </div>
          </form>
        ) : null}

        {company.capTableRounds.length === 0 ? (
          <p className="text-sm text-muted-foreground">No funding rounds recorded.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Round</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Raised</TableHead>
                <TableHead>Post-Money</TableHead>
                <TableHead>Lead</TableHead>
                {canEdit ? <TableHead className="w-[80px]" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {company.capTableRounds.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.roundName}</TableCell>
                  <TableCell>{formatDate(r.roundDate)}</TableCell>
                  <TableCell>{formatMoney(r.amountRaised, currency)}</TableCell>
                  <TableCell>{formatMoney(r.postMoneyValuation, currency)}</TableCell>
                  <TableCell>{r.leadInvestor ?? "—"}</TableCell>
                  {canEdit ? (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(r)}><Pencil className="size-4" /></Button>
                        <DeleteEntryButton itemId={r.id} itemLabel={r.roundName} deleteAction={deletePeCapTableRound} title="Delete round?" />
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
  );
}

function DilutionSection({
  company,
  canEdit,
  section,
  setSection,
  editing,
  setEditing,
}: {
  company: SerializedPeCompany;
  canEdit: boolean;
  section: string | null;
  setSection: (v: "shareholder" | "round" | "dilution" | null) => void;
  editing: Dilution | null;
  setEditing: (v: Dilution | null) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [eventType, setEventType] = useState<string>(editing?.eventType ?? "OTHER");
  const showForm = section === "dilution" || editing;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("companyId", company.id);
    formData.set("eventType", eventType);
    if (editing?.id) formData.set("id", editing.id);

    startTransition(async () => {
      try {
        await upsertPeDilutionEvent(formData);
        setSection(null);
        setEditing(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save event.");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Dilution Events</CardTitle>
          <CardDescription>ESOP grants, conversions, and other dilution</CardDescription>
        </div>
        {canEdit && !showForm ? (
          <Button size="sm" onClick={() => setSection("dilution")}>Add Event</Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {canEdit && showForm ? (
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 rounded-lg border p-4">
            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PE_DILUTION_EVENT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventDate">Date</Label>
              <Input id="eventDate" name="eventDate" type="date" defaultValue={editing?.eventDate?.slice(0, 10) ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sharesIssued">Shares Issued</Label>
              <Input id="sharesIssued" name="sharesIssued" defaultValue={editing?.sharesIssued ?? ""} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={2} defaultValue={editing?.description ?? ""} />
            </div>
            {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" disabled={pending}>{pending ? "Saving..." : editing ? "Update" : "Add"}</Button>
              <Button type="button" variant="outline" onClick={() => { setSection(null); setEditing(null); }}>Cancel</Button>
            </div>
          </form>
        ) : null}

        {company.dilutionEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No dilution events recorded.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Shares</TableHead>
                <TableHead>Description</TableHead>
                {canEdit ? <TableHead className="w-[80px]" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {company.dilutionEvents.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{PE_DILUTION_EVENT_LABELS[e.eventType] ?? e.eventType}</TableCell>
                  <TableCell>{formatDate(e.eventDate)}</TableCell>
                  <TableCell>{e.sharesIssued ?? "—"}</TableCell>
                  <TableCell>{e.description ?? "—"}</TableCell>
                  {canEdit ? (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(e)}><Pencil className="size-4" /></Button>
                        <DeleteEntryButton itemId={e.id} itemLabel="dilution event" deleteAction={deletePeDilutionEvent} title="Delete event?" />
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
  );
}
