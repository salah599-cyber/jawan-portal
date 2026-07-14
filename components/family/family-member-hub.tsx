"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveFamilyMemberRelations } from "@/lib/actions/family-members";
import {
  FAMILY_KYC_STATUS_LABELS,
  FAMILY_MEMBER_ID_TYPE_LABELS,
  FAMILY_OWNERSHIP_STAKE_TYPE_LABELS,
  FAMILY_RELATIONSHIP_LABELS,
  FAMILY_SIGNATORY_ROLE_TYPE_LABELS,
  BENEFICIARY_DESIGNATION_TYPE_LABELS,
} from "@/lib/labels";
import { formatDate } from "@/lib/format";
import type { SerializedFamilyMember } from "@/lib/family/serialize";
import { FamilyOwnershipStakesFields } from "@/components/family/family-ownership-stakes-fields";
import { FamilySignatoryRolesFields } from "@/components/family/family-signatory-roles-fields";
import { BeneficiaryDesignationsFields } from "@/components/family/beneficiary-designations-fields";
import { UploadFamilyMemberDocumentsForm } from "@/components/family/upload-family-member-documents-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LinkOptions = Awaited<ReturnType<typeof import("@/lib/actions/family-members").getFamilyLinkOptions>>;

function RelationsForm({
  memberId,
  canEdit,
  children,
  fieldName,
}: {
  memberId: string;
  canEdit: boolean;
  children: React.ReactNode;
  fieldName: string;
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
            await saveFamilyMemberRelations(memberId, formData);
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

export function FamilyMemberHub({
  member,
  linkOptions,
  canEdit,
}: {
  member: SerializedFamilyMember;
  linkOptions: LinkOptions;
  canEdit: boolean;
}) {
  const [tab, setTab] = useState("identity");

  const initialStakes = member.ownershipStakes.map((s) => ({
    entityId: s.entityId ?? undefined,
    assetId: s.assetId ?? undefined,
    landParcelId: s.landParcelId ?? undefined,
    registeredCompanyId: s.registeredCompanyId ?? undefined,
    rePropertyId: s.rePropertyId ?? undefined,
    vehicleId: s.vehicleId ?? undefined,
    stakeType: s.stakeType,
    ownershipPct: s.ownershipPct ?? undefined,
    roleLabel: s.roleLabel ?? undefined,
    notes: s.notes ?? undefined,
  }));

  const initialRoles = member.signatoryRoles.map((r) => ({
    entityId: r.entityId,
    registeredCompanyId: r.registeredCompanyId ?? undefined,
    assetId: r.assetId ?? undefined,
    vehicleId: r.vehicleId ?? undefined,
    roleType: r.roleType,
    bankName: r.bankName ?? undefined,
    accountRef: r.accountRef ?? undefined,
    notes: r.notes ?? undefined,
    isActive: r.isActive,
  }));

  const initialDesignations = member.beneficiaryDesignations.map((d) => ({
    insurancePolicyId: d.insurancePolicyId ?? undefined,
    assetId: d.assetId ?? undefined,
    landParcelId: d.landParcelId ?? undefined,
    registeredCompanyId: d.registeredCompanyId ?? undefined,
    rePropertyId: d.rePropertyId ?? undefined,
    vehicleId: d.vehicleId ?? undefined,
    designationType: d.designationType,
    allocationPct: d.allocationPct ?? undefined,
    notes: d.notes ?? undefined,
  }));

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
        <TabsTrigger value="identity">Identity & KYC</TabsTrigger>
        <TabsTrigger value="stakes">Ownership Stakes</TabsTrigger>
        <TabsTrigger value="signatory">Signatory Roles</TabsTrigger>
        <TabsTrigger value="beneficiary">Beneficiary Designations</TabsTrigger>
        <TabsTrigger value="documents">Documents</TabsTrigger>
      </TabsList>

      <TabsContent value="identity" className="mt-4 space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>{member.fullName}</CardTitle>
              <CardDescription>
                {member.relationship ? FAMILY_RELATIONSHIP_LABELS[member.relationship] : "Family member"}
              </CardDescription>
            </div>
            <Badge>{FAMILY_KYC_STATUS_LABELS[member.effectiveKycStatus] ?? member.effectiveKycStatus}</Badge>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div><p className="text-xs text-muted-foreground">Nationality</p><p>{member.nationality ?? "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">Date of Birth</p><p>{member.dateOfBirth ? formatDate(member.dateOfBirth) : "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">ID</p><p>{member.idType ? `${FAMILY_MEMBER_ID_TYPE_LABELS[member.idType]}: ${member.idNumber ?? "—"}` : "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">ID Expiry</p><p>{member.idExpiryDate ? formatDate(member.idExpiryDate) : "—"}</p></div>
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Email Addresses</p>
              {member.emails.length > 0 ? (
                <ul className="space-y-1">
                  {member.emails.map((row) => (
                    <li key={row.id}>
                      {row.email}
                      {row.label ? <span className="text-muted-foreground"> · {row.label}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{member.email ?? "—"}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Phone Numbers</p>
              {member.phones.length > 0 ? (
                <ul className="space-y-1">
                  {member.phones.map((row) => (
                    <li key={row.id}>
                      {row.phone}
                      {row.label ? <span className="text-muted-foreground"> · {row.label}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{member.phonePrimary ?? "—"}</p>
              )}
            </div>
            <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">Address</p><p>{member.address ?? "—"}</p></div>
            {canEdit ? (
              <div className="sm:col-span-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/family/members/${member.id}/edit`}>Edit identity & contacts</Link>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="stakes" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Ownership Stakes</CardTitle>
            <CardDescription>Economic and legal ownership across entities and assets</CardDescription>
          </CardHeader>
          <CardContent>
            {canEdit ? (
              <RelationsForm memberId={member.id} canEdit={canEdit} fieldName="stakesJson">
                <FamilyOwnershipStakesFields initialStakes={initialStakes} linkOptions={linkOptions} />
              </RelationsForm>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Target</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {member.ownershipStakes.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        {s.assetName ?? s.landParcelName ?? s.registeredCompanyName ?? s.rePropertyName ?? s.vehicleName ?? s.entityName ?? "—"}
                      </TableCell>
                      <TableCell>{FAMILY_OWNERSHIP_STAKE_TYPE_LABELS[s.stakeType] ?? s.stakeType}</TableCell>
                      <TableCell>{s.ownershipPct ? `${s.ownershipPct}%` : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="signatory" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Signatory Roles</CardTitle>
            <CardDescription>Bank and entity signing authority</CardDescription>
          </CardHeader>
          <CardContent>
            {canEdit ? (
              <RelationsForm memberId={member.id} canEdit={canEdit} fieldName="signatoryRolesJson">
                <FamilySignatoryRolesFields initialRoles={initialRoles} linkOptions={linkOptions} />
              </RelationsForm>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Bank</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {member.signatoryRoles.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.entityName}</TableCell>
                      <TableCell>{FAMILY_SIGNATORY_ROLE_TYPE_LABELS[r.roleType] ?? r.roleType}</TableCell>
                      <TableCell>{r.bankName ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="beneficiary" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Beneficiary Designations</CardTitle>
            <CardDescription>Allocations on policies and assets</CardDescription>
          </CardHeader>
          <CardContent>
            {canEdit ? (
              <RelationsForm memberId={member.id} canEdit={canEdit} fieldName="beneficiaryDesignationsJson">
                <BeneficiaryDesignationsFields initialDesignations={initialDesignations} linkOptions={linkOptions} />
              </RelationsForm>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Target</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Allocation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {member.beneficiaryDesignations.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        {d.insuranceLabel ?? d.assetName ?? d.landParcelName ?? d.registeredCompanyName ?? d.rePropertyName ?? d.vehicleName ?? "—"}
                      </TableCell>
                      <TableCell>{BENEFICIARY_DESIGNATION_TYPE_LABELS[d.designationType] ?? d.designationType}</TableCell>
                      <TableCell>{d.allocationPct ? `${d.allocationPct}%` : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="documents" className="mt-4">
        <UploadFamilyMemberDocumentsForm member={member} canEdit={canEdit} />
      </TabsContent>
    </Tabs>
  );
}
