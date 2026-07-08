"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import {
  createMaintenanceRequest,
  updateMaintenanceRequest,
  updateMaintenanceStatus,
} from "@/lib/actions/real-estate";
import {
  RE_MAINTENANCE_CATEGORY_LABELS,
  RE_MAINTENANCE_PRIORITY_LABELS,
  RE_MAINTENANCE_STATUS_LABELS,
} from "@/lib/labels";
import { formatDate, formatOmr } from "@/lib/format";
import type { SerializedReProperty } from "@/lib/real-estate/serialize";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type MaintenanceRow = SerializedReProperty["maintenance"][number];

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "COMPLETED") return "default";
  if (status === "OPEN" || status === "IN_PROGRESS") return "secondary";
  if (status === "CANCELLED") return "outline";
  return "outline";
}

function MaintenanceForm({
  property,
  initial,
  onDone,
}: {
  property: SerializedReProperty;
  initial?: MaintenanceRow;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>(initial?.category ?? "OTHER");
  const [priority, setPriority] = useState<string>(initial?.priority ?? "MEDIUM");
  const [unitId, setUnitId] = useState(initial?.unitId ?? "none");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("category", category);
    formData.set("priority", priority);
    formData.set("unitId", unitId === "none" ? "" : unitId);

    startTransition(async () => {
      try {
        if (initial) {
          await updateMaintenanceRequest(initial.id, formData);
        } else {
          await createMaintenanceRequest(property.id, formData);
        }
        onDone();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save maintenance request.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label>Unit (optional)</Label>
        <Select value={unitId} onValueChange={setUnitId}>
          <SelectTrigger><SelectValue placeholder="Property-wide" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Property-wide</SelectItem>
            {property.units.map((unit) => (
              <SelectItem key={unit.id} value={unit.id}>Unit {unit.unitNumber}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(RE_MAINTENANCE_CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Priority</Label>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(RE_MAINTENANCE_PRIORITY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="reportedDate">Reported Date</Label>
        <Input
          id="reportedDate"
          name="reportedDate"
          type="date"
          defaultValue={initial?.reportedDate?.slice(0, 10)}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          required
          rows={3}
          defaultValue={initial?.description ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="assignedTo">Assigned To</Label>
        <Input id="assignedTo" name="assignedTo" defaultValue={initial?.assignedTo ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contractorCompany">Contractor</Label>
        <Input id="contractorCompany" name="contractorCompany" defaultValue={initial?.contractorCompany ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="quotedCostOmr">Quoted Cost (OMR)</Label>
        <Input id="quotedCostOmr" name="quotedCostOmr" defaultValue={initial?.quotedCostOmr ?? ""} />
      </div>
      {initial ? (
        <div className="space-y-2">
          <Label htmlFor="actualCostOmr">Actual Cost (OMR)</Label>
          <Input id="actualCostOmr" name="actualCostOmr" defaultValue={initial.actualCostOmr ?? ""} />
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
      <div className="flex gap-2 md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : initial ? "Update" : "Add Request"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

export function ReMaintenanceTab({
  property,
  canEdit,
}: {
  property: SerializedReProperty;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MaintenanceRow | null>(null);
  const [completing, setCompleting] = useState<MaintenanceRow | null>(null);
  const [completeCost, setCompleteCost] = useState("");
  const [completeError, setCompleteError] = useState<string | null>(null);

  const openCount = property.maintenance.filter((r) => r.status === "OPEN" || r.status === "IN_PROGRESS").length;
  const completedCount = property.maintenance.filter((r) => r.status === "COMPLETED").length;
  const totalCost = property.maintenance.reduce(
    (sum, r) => sum + parseFloat(r.actualCostOmr ?? r.quotedCostOmr ?? "0"),
    0,
  );

  function openCompleteDialog(request: MaintenanceRow) {
    setCompleting(request);
    setCompleteCost(request.actualCostOmr ?? request.quotedCostOmr ?? "");
    setCompleteError(null);
  }

  function markCompleted() {
    if (!completing) return;
    setCompleteError(null);
    const formData = new FormData();
    if (completeCost.trim()) {
      formData.set("actualCostOmr", completeCost.trim());
    }

    startTransition(async () => {
      try {
        await updateMaintenanceStatus(completing.id, "COMPLETED", formData);
        setCompleting(null);
        router.refresh();
      } catch (err) {
        setCompleteError(err instanceof Error ? err.message : "Failed to complete maintenance.");
      }
    });
  }

  const formOpen = showForm || editing;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open / In Progress</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-semibold">{openCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-semibold">{completedCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cost</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-semibold">{formatOmr(totalCost)}</p></CardContent>
        </Card>
      </div>

      {canEdit && !formOpen ? (
        <Button onClick={() => setShowForm(true)}>Add Maintenance Request</Button>
      ) : null}

      {canEdit && formOpen ? (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Update Request" : "Add Maintenance Request"}</CardTitle>
          </CardHeader>
          <CardContent>
            <MaintenanceForm
              property={property}
              initial={editing ?? undefined}
              onDone={() => {
                setShowForm(false);
                setEditing(null);
              }}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Maintenance Requests</CardTitle>
          <CardDescription>{property.maintenance.length} request(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {property.maintenance.length === 0 ? (
            <p className="text-sm text-muted-foreground">No maintenance requests.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  {canEdit ? <TableHead className="w-[120px]" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {property.maintenance.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{formatDate(request.reportedDate)}</TableCell>
                    <TableCell>{request.unit?.unitNumber ?? "—"}</TableCell>
                    <TableCell>
                      {RE_MAINTENANCE_CATEGORY_LABELS[request.category] ?? request.category}
                    </TableCell>
                    <TableCell>
                      {RE_MAINTENANCE_PRIORITY_LABELS[request.priority] ?? request.priority}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{request.description}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(request.status)}>
                        {RE_MAINTENANCE_STATUS_LABELS[request.status] ?? request.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatOmr(request.actualCostOmr ?? request.quotedCostOmr)}
                    </TableCell>
                    {canEdit ? (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditing(request)}
                            aria-label="Edit"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          {request.status !== "COMPLETED" && request.status !== "CANCELLED" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={pending}
                              onClick={() => openCompleteDialog(request)}
                            >
                              Complete
                            </Button>
                          ) : null}
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

      <Dialog open={!!completing} onOpenChange={(open) => !open && setCompleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Maintenance</DialogTitle>
            <DialogDescription>
              {completing
                ? `${completing.description} · recorded cost flows to Financials and portfolio totals`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="completeCostOmr">Actual Cost (OMR)</Label>
            <Input
              id="completeCostOmr"
              value={completeCost}
              onChange={(e) => setCompleteCost(e.target.value)}
              placeholder={completing?.quotedCostOmr ? `Quoted: ${completing.quotedCostOmr}` : "Enter cost"}
            />
          </div>
          {completeError ? <p className="text-sm text-destructive">{completeError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCompleting(null)}>
              Cancel
            </Button>
            <Button type="button" disabled={pending} onClick={markCompleted}>
              {pending ? "Saving..." : "Mark Completed"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
