"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveSuccessionPlanRelations } from "@/lib/actions/succession";
import { SUCCESSION_PLAN_STATUS_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import type { SerializedSuccessionPlan } from "@/lib/succession/serialize";
import { SuccessionDisclaimer } from "@/components/succession/succession-disclaimer";
import { SuccessionDistributionFields } from "@/components/succession/succession-distribution-fields";
import { SuccessionAppointmentsFields } from "@/components/succession/succession-appointments-fields";
import { SuccessionChecklist } from "@/components/succession/succession-checklist";
import { UploadSuccessionDocumentsForm } from "@/components/succession/upload-succession-documents-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SUCCESSION_APPOINTMENT_ROLE_LABELS } from "@/lib/labels";

type LinkOptions = Awaited<ReturnType<typeof import("@/lib/actions/family-members").getFamilyLinkOptions>>;
type MemberOption = { id: string; fullName: string };

function RelationsForm({
  planId,
  canEdit,
  children,
}: {
  planId: string;
  canEdit: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!canEdit) return <>{children}</>;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            await saveSuccessionPlanRelations(planId, formData);
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save.");
          }
        });
      }}
      className="space-y-4"
    >
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save"}</Button>
    </form>
  );
}

export function SuccessionPlanHub({
  plan,
  linkOptions,
  members,
  canEdit,
}: {
  plan: SerializedSuccessionPlan;
  linkOptions: LinkOptions;
  members: MemberOption[];
  canEdit: boolean;
}) {
  const [tab, setTab] = useState("overview");

  const initialDistribution = plan.distributionInstructions.map((d) => ({
    beneficiaryMemberId: d.beneficiaryMemberId ?? undefined,
    entityId: d.entityId ?? undefined,
    assetId: d.assetId ?? undefined,
    landParcelId: d.landParcelId ?? undefined,
    registeredCompanyId: d.registeredCompanyId ?? undefined,
    rePropertyId: d.rePropertyId ?? undefined,
    vehicleId: d.vehicleId ?? undefined,
    allocationPct: d.allocationPct ?? undefined,
    allocationAmount: d.allocationAmount ?? undefined,
    currency: d.currency,
    instructions: d.instructions ?? undefined,
  }));

  const initialAppointments = plan.appointments.map((a) => ({
    familyMemberId: a.familyMemberId,
    role: a.role,
    isPrimary: a.isPrimary,
    notes: a.notes ?? undefined,
  }));

  return (
    <div className="space-y-4">
      <SuccessionDisclaimer />
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="documents">Legal Documents</TabsTrigger>
          <TabsTrigger value="appointments">Executors & Trustees</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="review">Review Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>{plan.title}</CardTitle>
                <CardDescription>{plan.entityName ?? "No primary entity"}</CardDescription>
              </div>
              <Badge>{SUCCESSION_PLAN_STATUS_LABELS[plan.effectiveStatus] ?? plan.effectiveStatus}</Badge>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Checklist</p><p>{plan.checklistCompletionPct}% complete</p></div>
              <div><p className="text-xs text-muted-foreground">Missing Documents</p><p>{plan.missingDocsCount}</p></div>
              <div><p className="text-xs text-muted-foreground">Next Review</p><p>{plan.nextReviewDate ? formatDate(plan.nextReviewDate) : "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Last Review</p><p>{plan.lastReviewDate ? formatDate(plan.lastReviewDate) : "—"}</p></div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">General Instructions</p>
                <p className="whitespace-pre-wrap">{plan.generalInstructions ?? "—"}</p>
              </div>
              {canEdit ? (
                <div className="sm:col-span-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/family/succession/${plan.id}/edit`}>Edit plan metadata</Link>
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribution Instructions</CardTitle>
              <CardDescription>How assets and entities should be transferred</CardDescription>
            </CardHeader>
            <CardContent>
              {canEdit ? (
                <RelationsForm planId={plan.id} canEdit={canEdit}>
                  <SuccessionDistributionFields
                    initialItems={initialDistribution}
                    linkOptions={linkOptions}
                    members={members}
                  />
                </RelationsForm>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Beneficiary</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Allocation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.distributionInstructions.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{d.beneficiaryName ?? "—"}</TableCell>
                        <TableCell>
                          {d.assetName ?? d.landParcelName ?? d.registeredCompanyName ?? d.rePropertyName ?? d.vehicleName ?? d.entityName ?? "—"}
                        </TableCell>
                        <TableCell>
                          {d.allocationPct ? `${d.allocationPct}%` : d.allocationAmount ? `${d.allocationAmount} ${d.currency}` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <UploadSuccessionDocumentsForm plan={plan} canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="appointments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Executors & Trustees</CardTitle>
              <CardDescription>Appointed family members for estate administration</CardDescription>
            </CardHeader>
            <CardContent>
              {canEdit ? (
                <RelationsForm planId={plan.id} canEdit={canEdit}>
                  <SuccessionAppointmentsFields initialAppointments={initialAppointments} members={members} />
                </RelationsForm>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Primary</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.appointments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{a.memberName}</TableCell>
                        <TableCell>{SUCCESSION_APPOINTMENT_ROLE_LABELS[a.role] ?? a.role}</TableCell>
                        <TableCell>{a.isPrimary ? "Yes" : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist" className="mt-4">
          <SuccessionChecklist plan={plan} canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="review" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Review Schedule</CardTitle>
              <CardDescription>Periodic review of estate planning documentation</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Last Review</p><p>{plan.lastReviewDate ? formatDate(plan.lastReviewDate) : "Not recorded"}</p></div>
              <div><p className="text-xs text-muted-foreground">Next Review</p><p>{plan.nextReviewDate ? formatDate(plan.nextReviewDate) : "Not scheduled"}</p></div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Incapacitation Notes</p>
                <p className="whitespace-pre-wrap">{plan.incapacitationNotes ?? "—"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
