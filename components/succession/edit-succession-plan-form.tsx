"use client";

import { useState, useTransition } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { updateSuccessionPlan } from "@/lib/actions/succession";
import { SUCCESSION_PLAN_STATUS_LABELS } from "@/lib/labels";
import type { SerializedSuccessionPlan } from "@/lib/succession/serialize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";
import { SuccessionDisclaimer } from "@/components/succession/succession-disclaimer";

export function EditSuccessionPlanForm({
  plan,
  entities,
}: {
  plan: SerializedSuccessionPlan;
  entities: EntityOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [entityId, setEntityId] = useState(plan.entityId ?? "");
  const [status, setStatus] = useState<string>(plan.status);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    if (entityId) formData.set("entityId", entityId);
    formData.set("status", status);

    startTransition(async () => {
      try {
        await updateSuccessionPlan(plan.id, formData);
      } catch (err) {
        if (isRedirectError(err)) throw err;
        setError(err instanceof Error ? err.message : "Failed to update plan.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <SuccessionDisclaimer />
      <Card>
        <CardHeader>
          <CardTitle>Edit Succession Plan</CardTitle>
          <CardDescription>{plan.title}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Plan Title</Label>
              <Input id="title" name="title" defaultValue={plan.title} required />
            </div>
            <div className="space-y-2">
              <Label>Primary Entity</Label>
              <EntitySelect entities={entities} value={entityId} onValueChange={setEntityId} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SUCCESSION_PLAN_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastReviewDate">Last Review</Label>
              <Input id="lastReviewDate" name="lastReviewDate" type="date" defaultValue={plan.lastReviewDate?.slice(0, 10) ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextReviewDate">Next Review</Label>
              <Input id="nextReviewDate" name="nextReviewDate" type="date" defaultValue={plan.nextReviewDate?.slice(0, 10) ?? ""} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="generalInstructions">General Instructions</Label>
              <Textarea id="generalInstructions" name="generalInstructions" rows={4} defaultValue={plan.generalInstructions ?? ""} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="incapacitationNotes">Incapacitation Notes</Label>
              <Textarea id="incapacitationNotes" name="incapacitationNotes" rows={3} defaultValue={plan.incapacitationNotes ?? ""} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={2} defaultValue={plan.notes ?? ""} />
            </div>
            {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
            <div className="md:col-span-2">
              <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save Changes"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
