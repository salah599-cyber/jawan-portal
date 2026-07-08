"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertPeGovernance } from "@/lib/actions/pe-portfolio";
import { PE_ANTI_DILUTION_LABELS } from "@/lib/labels";
import type { SerializedPeCompany } from "@/lib/pe/serialize";
import { PeDetailField } from "@/components/pe/pe-detail-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PeGovernanceTab({
  company,
  canEdit,
}: {
  company: SerializedPeCompany;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(!company.governance && canEdit);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [antiDilution, setAntiDilution] = useState<string>(company.governance?.antiDilution ?? "NONE");
  const gov = company.governance;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("companyId", company.id);
    formData.set("antiDilution", antiDilution);

    startTransition(async () => {
      try {
        await upsertPeGovernance(formData);
        setEditing(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save governance rights.");
      }
    });
  }

  if (!gov && !canEdit) {
    return <p className="text-sm text-muted-foreground">No governance rights recorded.</p>;
  }

  if (editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{gov ? "Edit Governance Rights" : "Add Governance Rights"}</CardTitle>
          <CardDescription>Board seats, investor protections, and information rights</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="boardSeat" defaultChecked={gov?.boardSeat} />
                Board seat
              </label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="boardRepName">Board Representative</Label>
              <Input id="boardRepName" name="boardRepName" defaultValue={gov?.boardRepName ?? ""} />
            </div>
            <div className="space-y-2 flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="observerRights" defaultChecked={gov?.observerRights} />
                Observer rights
              </label>
            </div>
            <div className="space-y-2 flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="informationRights" defaultChecked={gov?.informationRights} />
                Information rights
              </label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportingFrequency">Reporting Frequency</Label>
              <Input id="reportingFrequency" name="reportingFrequency" placeholder="e.g. Quarterly" defaultValue={gov?.reportingFrequency ?? ""} />
            </div>
            <div className="space-y-2 flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="proRataRights" defaultChecked={gov?.proRataRights} />
                Pro-rata rights
              </label>
            </div>
            <div className="space-y-2 flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="dragAlong" defaultChecked={gov?.dragAlong} />
                Drag-along
              </label>
            </div>
            <div className="space-y-2 flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="tagAlong" defaultChecked={gov?.tagAlong} />
                Tag-along
              </label>
            </div>
            <div className="space-y-2">
              <Label>Anti-Dilution</Label>
              <Select value={antiDilution} onValueChange={setAntiDilution}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PE_ANTI_DILUTION_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextRoundTrigger">Next Round Trigger</Label>
              <Input id="nextRoundTrigger" name="nextRoundTrigger" defaultValue={gov?.nextRoundTrigger ?? ""} />
            </div>
            {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save"}</Button>
              {gov ? (
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Governance Rights</CardTitle>
          <CardDescription>Investor protections and board representation</CardDescription>
        </div>
        {canEdit ? <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button> : null}
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <PeDetailField label="Board Seat" value={gov?.boardSeat ? <Badge>Yes</Badge> : "No"} />
        <PeDetailField label="Board Representative" value={gov?.boardRepName} />
        <PeDetailField label="Observer Rights" value={gov?.observerRights ? "Yes" : "No"} />
        <PeDetailField label="Information Rights" value={gov?.informationRights ? "Yes" : "No"} />
        <PeDetailField label="Reporting Frequency" value={gov?.reportingFrequency} />
        <PeDetailField label="Pro-Rata Rights" value={gov?.proRataRights ? "Yes" : "No"} />
        <PeDetailField label="Drag-Along" value={gov?.dragAlong ? "Yes" : "No"} />
        <PeDetailField label="Tag-Along" value={gov?.tagAlong ? "Yes" : "No"} />
        <PeDetailField label="Anti-Dilution" value={gov ? PE_ANTI_DILUTION_LABELS[gov.antiDilution] ?? gov.antiDilution : "—"} />
        <PeDetailField label="Next Round Trigger" value={gov?.nextRoundTrigger} />
      </CardContent>
    </Card>
  );
}
