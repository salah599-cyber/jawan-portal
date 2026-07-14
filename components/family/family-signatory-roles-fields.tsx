"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { SignatoryAccountInput, SignatoryRoleInput } from "@/lib/family/types";
import { CASH_CURRENCIES } from "@/lib/cash/constants";
import { FAMILY_SIGNATORY_ROLE_TYPE_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type LinkOptions = Awaited<ReturnType<typeof import("@/lib/actions/family-members").getFamilyLinkOptions>>;

const NONE_COMPANY = "__none__";

const emptyAccount = (): SignatoryAccountInput => ({
  accountNumber: "",
  currency: "OMR",
  label: "",
});

const emptyRole = (): SignatoryRoleInput => ({
  entityId: "",
  roleType: "OTHER",
  bankName: "",
  accounts: [],
  notes: "",
  isActive: true,
});

function normalizeRoleAccounts(role: SignatoryRoleInput): SignatoryAccountInput[] {
  const fromAccounts = (role.accounts ?? [])
    .map((account) => ({
      accountNumber: account.accountNumber?.trim() ?? "",
      currency: account.currency?.trim() || "OMR",
      label: account.label?.trim() ?? "",
    }))
    .filter((account) => account.accountNumber);

  if (fromAccounts.length > 0) return fromAccounts;

  const legacyRef = role.accountRef?.trim();
  if (legacyRef) {
    return [{ accountNumber: legacyRef, currency: "OMR", label: "" }];
  }

  return [];
}

export function serializeSignatoryRolesJson(roles: SignatoryRoleInput[]): string {
  return JSON.stringify(
    roles
      .filter((role) => role.entityId?.trim())
      .map((role) => {
        const accounts = normalizeRoleAccounts(role).map((account) => ({
          accountNumber: account.accountNumber,
          currency: account.currency || "OMR",
          label: account.label?.trim() || undefined,
        }));

        return {
          entityId: role.entityId.trim(),
          registeredCompanyId: role.registeredCompanyId?.trim() || undefined,
          assetId: role.assetId?.trim() || undefined,
          vehicleId: role.vehicleId?.trim() || undefined,
          roleType: role.roleType || "OTHER",
          bankName: role.bankName?.trim() || undefined,
          accounts,
          effectiveFrom: role.effectiveFrom?.trim() || undefined,
          effectiveTo: role.effectiveTo?.trim() || undefined,
          isActive: role.isActive !== false,
          notes: role.notes?.trim() || undefined,
        };
      }),
  );
}

function SignatoryAccountsEditor({
  accounts,
  onChange,
}: {
  accounts: SignatoryAccountInput[];
  onChange: (accounts: SignatoryAccountInput[]) => void;
}) {
  const rows = accounts.length > 0 ? accounts : [emptyAccount()];

  function updateAccount(index: number, field: keyof SignatoryAccountInput, value: string) {
    onChange(rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function addAccount() {
    onChange([...rows, emptyAccount()]);
  }

  function removeAccount(index: number) {
    const next = rows.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [emptyAccount()]);
  }

  return (
    <div className="md:col-span-2 space-y-3 rounded-lg border bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Accounts at this bank</p>
          <p className="text-xs text-muted-foreground">Add each account number and currency separately.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addAccount}>
          Add account
        </Button>
      </div>
      {rows.map((account, accountIndex) => (
        <div
          key={accountIndex}
          className="grid gap-3 rounded-lg border bg-background p-3 md:grid-cols-[1fr_120px_1fr_auto]"
        >
          <div className="space-y-2">
            <Label>Account Number</Label>
            <Input
              value={account.accountNumber}
              onChange={(e) => updateAccount(accountIndex, "accountNumber", e.target.value)}
              placeholder="1049-485882-001"
            />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select
              value={account.currency || "OMR"}
              onValueChange={(value) => updateAccount(accountIndex, "currency", value)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CASH_CURRENCIES.map((currency) => (
                  <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Label (optional)</Label>
            <Input
              value={account.label ?? ""}
              onChange={(e) => updateAccount(accountIndex, "label", e.target.value)}
              placeholder="Current, savings…"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={rows.length === 1}
              onClick={() => removeAccount(accountIndex)}
            >
              Remove
            </Button>
          </div>
        </div>
      ))}
    </div>
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
    initialRoles.length > 0
      ? initialRoles.map((role) => ({
          ...role,
          accounts: normalizeRoleAccounts(role),
        }))
      : [],
  );

  function updateRole(index: number, field: keyof SignatoryRoleInput, value: string | boolean) {
    setRoles((current) =>
      current.map((role, i) => (i === index ? { ...role, [field]: value } : role)),
    );
  }

  function updateRoleAccounts(index: number, accounts: SignatoryAccountInput[]) {
    setRoles((current) =>
      current.map((role, i) =>
        i === index
          ? {
              ...role,
              accounts: accounts.filter((account) => account.accountNumber.trim()),
            }
          : role,
      ),
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
            <Input
              value={role.bankName ?? ""}
              onChange={(e) => updateRole(index, "bankName", e.target.value)}
              placeholder="National Bank of Oman"
            />
          </div>
          <SignatoryAccountsEditor
            accounts={role.accounts && role.accounts.length > 0 ? role.accounts : [emptyAccount()]}
            onChange={(accounts) => updateRoleAccounts(index, accounts)}
          />
          <div className="space-y-2 md:col-span-2">
            <Label>Notes</Label>
            <Textarea value={role.notes ?? ""} onChange={(e) => updateRole(index, "notes", e.target.value)} rows={2} />
          </div>
        </div>
      ))}
    </div>
  );
}
