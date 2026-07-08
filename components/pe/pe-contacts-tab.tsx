"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { upsertPeContact, deletePeContact } from "@/lib/actions/pe-portfolio";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { PE_CONTACT_ROLE_LABELS } from "@/lib/labels";
import type { SerializedPeCompany } from "@/lib/pe/serialize";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Contact = SerializedPeCompany["contacts"][number];

export function PeContactsTab({
  company,
  canEdit,
}: {
  company: SerializedPeCompany;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string>(editing?.role ?? "OTHER");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("companyId", company.id);
    formData.set("role", role);
    if (editing?.id) formData.set("id", editing.id);

    startTransition(async () => {
      try {
        await upsertPeContact(formData);
        setShowForm(false);
        setEditing(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save contact.");
      }
    });
  }

  const formOpen = showForm || editing;

  return (
    <div className="space-y-4">
      {canEdit && !formOpen ? (
        <Button onClick={() => setShowForm(true)}>Add Contact</Button>
      ) : null}

      {canEdit && formOpen ? (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Edit Contact" : "Add Contact"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required defaultValue={editing?.name ?? ""} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PE_CONTACT_ROLE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="isBoardRep" defaultChecked={editing?.isBoardRep} />
                  Board representative
                </label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={editing?.email ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" defaultValue={editing?.phone ?? ""} />
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
          <CardTitle>Key Contacts</CardTitle>
          <CardDescription>Founders, management, and advisors</CardDescription>
        </CardHeader>
        <CardContent>
          {company.contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contacts recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  {canEdit ? <TableHead className="w-[80px]" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {company.contacts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.name}
                      {c.isBoardRep ? <Badge className="ml-2" variant="outline">Board</Badge> : null}
                    </TableCell>
                    <TableCell>{PE_CONTACT_ROLE_LABELS[c.role] ?? c.role}</TableCell>
                    <TableCell>{c.email ?? "—"}</TableCell>
                    <TableCell>{c.phone ?? "—"}</TableCell>
                    {canEdit ? (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setEditing(c)}><Pencil className="size-4" /></Button>
                          <DeleteEntryButton itemId={c.id} itemLabel={c.name} deleteAction={deletePeContact} title="Delete contact?" />
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
