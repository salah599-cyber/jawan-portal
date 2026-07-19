"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createPublicBrokerAccount,
  deletePublicBrokerAccount,
  updatePublicBrokerAccount,
} from "@/lib/actions/public-markets";
import type { PublicBrokerAccountRow } from "@/lib/public-markets/broker-accounts";
import { PUBLIC_MANAGEMENT_TYPE_LABELS } from "@/lib/labels";
import { PortfolioManagementField } from "@/components/public-markets/portfolio-management-field";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Plus, Trash2 } from "lucide-react";

function BrokerAccountForm({
  entities,
  defaultEntityId,
  account,
  onDone,
}: {
  entities: EntityOption[];
  defaultEntityId?: string;
  account?: PublicBrokerAccountRow | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [entityId, setEntityId] = useState(account?.entityId ?? defaultEntityId ?? entities[0]?.id ?? "");
  const [isManaged, setIsManaged] = useState(account?.isManaged ?? true);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set("entityId", entityId);
    formData.set("isManaged", isManaged ? "true" : "false");
    if (account) formData.set("accountId", account.id);

    startTransition(async () => {
      try {
        if (account) {
          await updatePublicBrokerAccount(formData);
        } else {
          await createPublicBrokerAccount(formData);
        }
        onDone();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save broker account.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <Label>Entity</Label>
        <EntitySelect
          entities={entities}
          value={entityId}
          onValueChange={setEntityId}
          allowAdd={false}
          placeholder="Select entity"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="broker-account-broker">Broker</Label>
        <Input
          id="broker-account-broker"
          name="broker"
          required
          defaultValue={account?.broker ?? ""}
          placeholder="e.g. Charles Schwab"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="broker-account-number">Account number</Label>
        <Input
          id="broker-account-number"
          name="accountNumber"
          defaultValue={account?.accountNumber ?? ""}
          placeholder="Optional"
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="broker-account-label">Label</Label>
        <Input
          id="broker-account-label"
          name="label"
          defaultValue={account?.label ?? ""}
          placeholder="Optional display name"
        />
      </div>

      <PortfolioManagementField
        className="md:col-span-2"
        value={isManaged}
        onChange={setIsManaged}
      />

      {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}

      <div className="flex gap-2 md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : account ? "Update account" : "Add account"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function BrokerAccountsCard({
  entities,
  defaultEntityId,
  accounts,
}: {
  entities: EntityOption[];
  defaultEntityId?: string;
  accounts: PublicBrokerAccountRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PublicBrokerAccountRow | null>(null);

  function handleDelete(accountId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await deletePublicBrokerAccount(accountId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete broker account.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Broker Accounts</CardTitle>
            <CardDescription>
              Register brokerage accounts once, then choose managed or reference when importing
              statements.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingAccount(null);
              setShowForm(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add account
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm || editingAccount ? (
          <BrokerAccountForm
            entities={entities}
            defaultEntityId={defaultEntityId}
            account={editingAccount}
            onDone={() => {
              setShowForm(false);
              setEditingAccount(null);
            }}
          />
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No broker accounts yet. Add one before importing brokerage statements.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label / Broker</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Holdings</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{account.label || account.broker}</p>
                      {account.label ? (
                        <p className="text-xs text-muted-foreground">{account.broker}</p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{account.accountNumber ?? "—"}</TableCell>
                  <TableCell>
                    {account.isManaged
                      ? PUBLIC_MANAGEMENT_TYPE_LABELS.managed
                      : PUBLIC_MANAGEMENT_TYPE_LABELS.reference}
                  </TableCell>
                  <TableCell className="text-right">{account.holdingCount}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setShowForm(false);
                          setEditingAccount(account);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={pending || account.holdingCount > 0}
                        onClick={() => handleDelete(account.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
