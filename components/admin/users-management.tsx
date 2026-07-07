"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cancelPendingInvite,
  deactivateUser,
  inviteUser,
  reactivateUser,
  updateUserAccess,
} from "@/lib/actions/users";
import {
  MANAGEABLE_MODULES,
  USER_ROLE_OPTIONS,
  type UserAccessInput,
} from "@/lib/admin/user-options";
import type {
  SerializedPendingInviteRow,
  SerializedUserRow,
} from "@/lib/data/users";
import type { ModuleName, PermissionLevel, UserRole } from "@/lib/permissions/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { AddEntityButton, type EntityOption } from "@/components/platform/entity-select";

type DocumentCategoryOption = { id: string; name: string };

const PERMISSION_LEVELS: { value: PermissionLevel | "DEFAULT"; label: string }[] = [
  { value: "DEFAULT", label: "Role default" },
  { value: "FULL", label: "Full access" },
  { value: "READ", label: "Read only" },
  { value: "FILTERED", label: "Filtered" },
  { value: "NONE", label: "No access" },
];

function emptyAccess(): UserAccessInput {
  return {
    role: "EXTERNAL",
    isSuperAdmin: false,
    entityIds: [],
    moduleOverrides: {},
    documentCategories: [],
  };
}

function UserAccessFields({
  value,
  onChange,
  entities,
  documentCategories,
  onEntityAdded,
  showEmail,
}: {
  value: UserAccessInput;
  onChange: (next: UserAccessInput) => void;
  entities: EntityOption[];
  documentCategories: DocumentCategoryOption[];
  onEntityAdded?: (entity: EntityOption) => void;
  showEmail?: boolean;
}) {
  function toggleEntity(entityId: string) {
    const next = value.entityIds.includes(entityId)
      ? value.entityIds.filter((id) => id !== entityId)
      : [...value.entityIds, entityId];
    onChange({ ...value, entityIds: next });
  }

  function toggleDocumentCategory(categoryId: string) {
    const next = value.documentCategories.includes(categoryId)
      ? value.documentCategories.filter((c) => c !== categoryId)
      : [...value.documentCategories, categoryId];
    onChange({ ...value, documentCategories: next });
  }

  function setModuleLevel(module: ModuleName, level: PermissionLevel | "DEFAULT") {
    const next = { ...value.moduleOverrides };
    if (level === "DEFAULT") {
      delete next[module];
    } else {
      next[module] = level;
    }
    onChange({ ...value, moduleOverrides: next });
  }

  return (
    <div className="grid gap-4">
      {showEmail ? (
        <div className="space-y-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            required
            value={value.email ?? ""}
            onChange={(e) => onChange({ ...value, email: e.target.value })}
            placeholder="user@example.com"
          />
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Office role</Label>
          <Select
            value={value.role}
            onValueChange={(role) => onChange({ ...value, role: role as UserRole })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {USER_ROLE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2 pb-2">
          <input
            id="super-admin"
            type="checkbox"
            checked={value.isSuperAdmin}
            onChange={(e) => onChange({ ...value, isSuperAdmin: e.target.checked })}
            className="size-4"
          />
          <Label htmlFor="super-admin">Super admin (full platform + user management)</Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Module access overrides</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {MANAGEABLE_MODULES.map(({ module, label }) => (
            <div key={module} className="flex items-center justify-between gap-2 rounded-md border p-2">
              <span className="text-sm">{label}</span>
              <Select
                value={value.moduleOverrides[module] ?? "DEFAULT"}
                onValueChange={(level) =>
                  setModuleLevel(module, level as PermissionLevel | "DEFAULT")
                }
              >
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERMISSION_LEVELS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Entity access (for filtered modules)</Label>
          {onEntityAdded ? (
            <AddEntityButton
              label="Add entity"
              onEntityAdded={(entity) => {
                onEntityAdded(entity);
                if (!value.entityIds.includes(entity.id)) {
                  onChange({ ...value, entityIds: [...value.entityIds, entity.id] });
                }
              }}
            />
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {entities.map((entity) => (
            <label key={entity.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={value.entityIds.includes(entity.id)}
                onChange={() => toggleEntity(entity.id)}
              />
              {entity.name}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Document categories (for filtered document access)</Label>
        <div className="flex flex-wrap gap-2">
          {documentCategories.map((option) => (
            <label key={option.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={value.documentCategories.includes(option.id)}
                onChange={() => toggleDocumentCategory(option.id)}
              />
              {option.name}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function userToAccessInput(user: SerializedUserRow): UserAccessInput {
  const moduleOverrides: Partial<Record<ModuleName, PermissionLevel>> = {};
  for (const override of user.permissionOverrides) {
    moduleOverrides[override.module] = override.level;
  }
  return {
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
    entityIds: user.entityAccess.map((e) => e.entityId),
    moduleOverrides,
    documentCategories: user.documentScopes.map((s) => s.categoryId),
  };
}

export function UsersManagement({
  users,
  pendingInvites,
  entities,
  documentCategories,
}: {
  users: SerializedUserRow[];
  pendingInvites: SerializedPendingInviteRow[];
  entities: EntityOption[];
  documentCategories: DocumentCategoryOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [entityList, setEntityList] = useState(() =>
    [...entities].sort((a, b) => a.name.localeCompare(b.name)),
  );
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteData, setInviteData] = useState<UserAccessInput>(emptyAccess());
  const [editUser, setEditUser] = useState<SerializedUserRow | null>(null);
  const [editData, setEditData] = useState<UserAccessInput>(emptyAccess());

  const activeUsers = useMemo(() => users.filter((u) => u.isActive), [users]);
  const inactiveUsers = useMemo(() => users.filter((u) => !u.isActive), [users]);

  function handleEntityAdded(entity: EntityOption) {
    setEntityList((current) => {
      if (current.some((item) => item.id === entity.id)) return current;
      return [...current, entity].sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  function getActionErrorMessage(err: unknown, fallback: string) {
    if (err instanceof Error && err.message) return err.message;
    return fallback;
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await inviteUser(inviteData);
        setInviteOpen(false);
        setInviteData(emptyAccess());
        router.refresh();
      } catch (err) {
        setError(getActionErrorMessage(err, "Failed to send invitation."));
      }
    });
  }

  function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateUserAccess(editUser.id, editData);
        setEditUser(null);
        router.refresh();
      } catch (err) {
        setError(getActionErrorMessage(err, "Failed to update user."));
      }
    });
  }

  function openEdit(user: SerializedUserRow) {
    setEditUser(user);
    setEditData(userToAccessInput(user));
    setError(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Users</CardTitle>
            <CardDescription>Manage access and invite new users via Clerk email.</CardDescription>
          </div>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm">Invite User</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <form onSubmit={handleInvite}>
                <DialogHeader>
                  <DialogTitle>Invite user</DialogTitle>
                  <DialogDescription>
                    The user will receive a Clerk invitation email to set their password.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <UserAccessFields
                    value={inviteData}
                    onChange={setInviteData}
                    entities={entityList}
                    documentCategories={documentCategories}
                    onEntityAdded={handleEntityAdded}
                    showEmail
                  />
                </div>
                {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
                <DialogFooter>
                  <Button type="submit" disabled={pending}>
                    {pending ? "Sending..." : "Send invitation"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {[user.firstName, user.lastName].filter(Boolean).join(" ") || "-"}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary">{user.role}</Badge>
                      {user.isSuperAdmin ? <Badge>Super admin</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">Active</Badge></TableCell>
                  <TableCell>{formatDate(user.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => openEdit(user)}>
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            await deactivateUser(user.id);
                            router.refresh();
                          })
                        }
                      >
                        Deactivate
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pendingInvites.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Super admin</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>{invite.email}</TableCell>
                    <TableCell>{invite.role}</TableCell>
                    <TableCell>{invite.isSuperAdmin ? "Yes" : "No"}</TableCell>
                    <TableCell>{formatDate(invite.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            await cancelPendingInvite(invite.id);
                            router.refresh();
                          })
                        }
                      >
                        Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {inactiveUsers.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Inactive users</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inactiveUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            await reactivateUser(user.id);
                            router.refresh();
                          })
                        }
                      >
                        Reactivate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Edit user access</DialogTitle>
              <DialogDescription>{editUser?.email}</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <UserAccessFields
                value={editData}
                onChange={setEditData}
                entities={entityList}
                documentCategories={documentCategories}
                onEntityAdded={handleEntityAdded}
              />
            </div>
            {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
