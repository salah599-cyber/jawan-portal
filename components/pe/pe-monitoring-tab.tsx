"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { upsertPeMonitoringReport, deletePeMonitoringReport } from "@/lib/actions/pe-portfolio";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { PE_REPORT_TYPE_LABELS } from "@/lib/labels";
import { formatDate, formatMoney } from "@/lib/format";
import type { SerializedPeCompany } from "@/lib/pe/serialize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Report = SerializedPeCompany["monitoringReports"][number];

export function PeMonitoringTab({
  company,
  canEdit,
}: {
  company: SerializedPeCompany;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Report | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<string>(editing?.reportType ?? "QUARTERLY");
  const [documentId, setDocumentId] = useState(editing?.documentId ?? "none");
  const currency = company.reportingCurrency;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("companyId", company.id);
    formData.set("reportType", reportType);
    formData.set("documentId", documentId);
    if (editing?.id) formData.set("id", editing.id);

    startTransition(async () => {
      try {
        await upsertPeMonitoringReport(formData);
        setShowForm(false);
        setEditing(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save report.");
      }
    });
  }

  const formOpen = showForm || editing;

  return (
    <div className="space-y-4">
      {canEdit && !formOpen ? (
        <Button onClick={() => setShowForm(true)}>Add Monitoring Report</Button>
      ) : null}

      {canEdit && formOpen ? (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Edit Report" : "Add Monitoring Report"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reportDate">Report Date</Label>
                <Input id="reportDate" name="reportDate" type="date" required defaultValue={editing?.reportDate.slice(0, 10)} />
              </div>
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PE_REPORT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="revenueReporting">Revenue ({currency})</Label>
                <Input id="revenueReporting" name="revenueReporting" defaultValue={editing?.revenueReporting ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="burnRateReporting">Burn Rate ({currency})</Label>
                <Input id="burnRateReporting" name="burnRateReporting" defaultValue={editing?.burnRateReporting ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="runwayMonths">Runway (months)</Label>
                <Input id="runwayMonths" name="runwayMonths" defaultValue={editing?.runwayMonths ?? ""} />
              </div>
              <div className="space-y-2">
                <Label>Linked Document</Label>
                <Select value={documentId} onValueChange={setDocumentId}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {company.documents.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>{doc.fileName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="customKpis">Custom KPIs (JSON)</Label>
                <Textarea
                  id="customKpis"
                  name="customKpis"
                  rows={2}
                  placeholder='{"mrr": 120000, "arr": 1440000}'
                  defaultValue={editing?.customKpis ? JSON.stringify(editing.customKpis) : ""}
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
          <CardTitle>Monitoring Reports</CardTitle>
          <CardDescription>Periodic updates on financial performance and KPIs</CardDescription>
        </CardHeader>
        <CardContent>
          {company.monitoringReports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No monitoring reports recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Burn</TableHead>
                  <TableHead>Runway</TableHead>
                  {canEdit ? <TableHead className="w-[80px]" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {company.monitoringReports.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{formatDate(r.reportDate)}</TableCell>
                    <TableCell>{PE_REPORT_TYPE_LABELS[r.reportType] ?? r.reportType}</TableCell>
                    <TableCell>{formatMoney(r.revenueReporting, currency)}</TableCell>
                    <TableCell>{formatMoney(r.burnRateReporting, currency)}</TableCell>
                    <TableCell>{r.runwayMonths ? `${r.runwayMonths} mo` : "—"}</TableCell>
                    {canEdit ? (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setEditing(r)}><Pencil className="size-4" /></Button>
                          <DeleteEntryButton itemId={r.id} itemLabel="report" deleteAction={deletePeMonitoringReport} title="Delete report?" />
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
