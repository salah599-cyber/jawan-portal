"use client";

import { useState, useTransition } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { createSuccessionPlan } from "@/lib/actions/succession";
import { SUCCESSION_PLAN_STATUS_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";
import { SuccessionDisclaimer } from "@/components/succession/succession-disclaimer";

export function CreateSuccessionPlanForm({ entities }: { entities: EntityOption[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [entityId, setEntityId] = useState(entities[0]?.id ?? "");
  const [status, setStatus] = useState("DRAFT");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    if (entityId) formData.set("entityId", entityId);
    formData.set("status", status);

    startTransition(async () => {
      try {
        await createSuccessionPlan(formData);
      } catch (err) {
        if (isRedirectError(err)) throw err;
        setError(err instanceof Error ? err.message : "Failed to create plan.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <SuccessionDisclaimer />
      <Card>
        <CardHeader>
          <CardTitle>New Succession Plan</CardTitle>
          <CardDescription>Document estate planning intentions and legal documentation status.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Plan Title</Label>
              <Input id="title" name="title" required placeholder="e.g. Principal Estate Plan 2026" />
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
              <Label htmlFor="nextReviewDate">Next Review Date</Label>
              <Input id="nextReviewDate" name="nextReviewDate" type="date" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="generalInstructions">General Instructions</Label>
              <Textarea id="generalInstructions" name="generalInstructions" rows={4} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="incapacitationNotes">Incapacitation Notes</Label>
              <Textarea id="incapacitationNotes" name="incapacitationNotes" rows={3} />
            </div>
            {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
            <div className="md:col-span-2">
              <Button type="submit" disabled={pending}>{pending ? "Creating..." : "Create Plan"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
