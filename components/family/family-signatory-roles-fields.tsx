"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { SignatoryRoleInput } from "@/lib/family/types";
import { FAMILY_SIGNATORY_ROLE_TYPE_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type LinkOptions = Awaited<ReturnType<typeof import("@/lib/actions/family-members").getFamilyLinkOptions>>;

const NONE_COMPANY = "__none__";

const emptyRole = (): SignatoryRoleInput => ({
  entityId: "",
  roleType: "OTHER",
  bankName: "",
  accountRef: "",
  notes: "",
  isActive: true,
});

export function serializeSignatoryRolesJson(roles: SignatoryRoleInput[]): string {
  return JSON.stringify(
    roles
      .filter((role) => role.entityId?.trim())
      .map((role) => ({
        entityId: role.entityId.trim(),
        registeredCompanyId: role.registeredCompanyId?.trim() || undefined,
        assetId: role.assetId?.trim() || undefined,
        vehicleId: role.vehicleId?.trim() || undefined,
        roleType: role.roleType || "OTHER",
        bankName: role.bankName?.trim() || undefined,
        accountRef: role.accountRef?.trim() || undefined,
        effectiveFrom: role.effectiveFrom?.trim() || undefined,
        effectiveTo: role.effectiveTo?.trim() || undefined,
        isActive: role.isActive !== false,
        notes: role.notes?.trim() || undefined,
      })),
  );
}

export function FamilySignatoryRolesFields({
  initialRoles = [],
  linkOptions,
  signatoryRolesJsonName = "signatoryRolesJson",
}: {
  initialRoles?: SignatoryRoleInput[];
  linkOptions: LinkOptions;
  signatoryRolesJsonName?: string;
}) {
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [roles, setRoles] = useState<SignatoryRoleInput[]>(
    initialRoles.length > 0 ? initialRoles : [],
  );

  function updateRole(index: number, field: keyof SignatoryRoleInput, value: string | boolean) {
    setRoles((current) =>
      current.map((role, i) => (i === index ? { ...role, [field]: value } : role)),
    );
  }

  const serialized = serializeSignatoryRolesJson(roles);

  useLayoutEffect(() => {
    if (hiddenRef.current) {
      hiddenRef.current.value = serialized;
    }
  }, [serialized]);

  return (
    <div className="md:col-span-2 space-y-4">
      <input ref={hiddenRef} type="hidden" name={signatoryRolesJsonName} defaultValue={serialized} />
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-muted-foreground">Signatory Roles</p>
        <Button type="button" variant="outline" size="sm" onClick={() => setRoles((c) => [...c, emptyRole()])}>
          Add role
        </Button>
      </div>
      {roles.length === 0 ? (
        <p className="text-sm text-muted-foreground">No signatory roles recorded.</p>
      ) : null}
      {roles.map((role, index) => (
        <div key={index} className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
          <div className="flex items-center justify-between md:col-span-2">
            <p className="text-sm font-medium">Role {index + 1}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRoles((c) => c.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </div>
          <div className="space-y-2">
            <Label>Entity</Label>
            <Select
              value={role.entityId || undefined}
              onValueChange={(v) => updateRole(index, "entityId", v)}
            >
              <SelectTrigger><SelectValue placeholder="Select entity" /></SelectTrigger>
              <SelectContent>
                {linkOptions.entities.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Role Type</Label>
            <Select value={role.roleType ?? "OTHER"} onValueChange={(v) => updateRole(index, "roleType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(FAMILY_SIGNATORY_ROLE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Company (optional)</Label>
            <Select
              value={role.registeredCompanyId || NONE_COMPANY}
              onValueChange={(v) =>
                updateRole(index, "registeredCompanyId", v === NONE_COMPANY ? "" : v)
              }
            >
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_COMPANY}>None</SelectItem>
                {linkOptions.companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Bank Name</Label>
            <Input value={role.bankName ?? ""} onChange={(e) => updateRole(index, "bankName", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Account Reference</Label>
            <Input value={role.accountRef ?? ""} onChange={(e) => updateRole(index, "accountRef", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Notes</Label>
            <Textarea value={role.notes ?? ""} onChange={(e) => updateRole(index, "notes", e.target.value)} rows={2} />
          </div>
        </div>
      ))}
    </div>
  );
}
