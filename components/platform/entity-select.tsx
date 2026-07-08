"use client";

import { useState, useTransition } from "react";
import { createEntity } from "@/lib/actions/entities";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

export type EntityOption = { id: string; name: string };

function sortEntities(items: EntityOption[]) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

export function EntitySelect({
  entities: initialEntities,
  value,
  onValueChange,
  allowNone = false,
  noneLabel = "None",
  placeholder = "Select entity",
  allowAdd = true,
  onEntityAdded,
}: {
  entities: EntityOption[];
  value: string;
  onValueChange: (value: string) => void;
  allowNone?: boolean;
  noneLabel?: string;
  placeholder?: string;
  allowAdd?: boolean;
  onEntityAdded?: (entity: EntityOption) => void;
}) {
  const [entities, setEntities] = useState(() => sortEntities(initialEntities));
  const [prevInitialEntities, setPrevInitialEntities] = useState(initialEntities);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Re-derive sorted entities when the server-provided list changes, without
  // an effect (React's documented pattern for adjusting state from props).
  if (initialEntities !== prevInitialEntities) {
    setPrevInitialEntities(initialEntities);
    setEntities(sortEntities(initialEntities));
  }

  function handleAddEntity() {
    setError(null);
    startTransition(async () => {
      try {
        const entity = await createEntity(newName, newDescription);
        setEntities((current) => {
          if (current.some((item) => item.id === entity.id)) return current;
          return sortEntities([...current, entity]);
        });
        onEntityAdded?.(entity);
        onValueChange(entity.id);
        setNewName("");
        setNewDescription("");
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add entity.");
      }
    });
  }

  return (
    <div className="flex gap-2">
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allowNone ? <SelectItem value="none">{noneLabel}</SelectItem> : null}
          {entities.map((entity) => (
            <SelectItem key={entity.id} value={entity.id}>
              {entity.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {allowAdd ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="icon" aria-label="Add entity">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Entity</DialogTitle>
              <DialogDescription>
                Register a legal entity or holding company for assets, loans, and records.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newEntityName">Entity name</Label>
                <Input
                  id="newEntityName"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Jawan Holdings LLC"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newEntityDescription">Description (optional)</Label>
                <Textarea
                  id="newEntityDescription"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  placeholder="Brief notes about this entity"
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleAddEntity} disabled={pending || !newName.trim()}>
                {pending ? "Adding..." : "Add Entity"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

export function AddEntityButton({
  onEntityAdded,
  label = "Add entity",
}: {
  onEntityAdded: (entity: EntityOption) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAddEntity() {
    setError(null);
    startTransition(async () => {
      try {
        const entity = await createEntity(newName, newDescription);
        onEntityAdded(entity);
        setNewName("");
        setNewDescription("");
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add entity.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Entity</DialogTitle>
          <DialogDescription>
            Register a legal entity or holding company for assets, loans, and records.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="addEntityName">Entity name</Label>
            <Input
              id="addEntityName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Jawan Holdings LLC"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addEntityDescription">Description (optional)</Label>
            <Textarea
              id="addEntityDescription"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={2}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleAddEntity} disabled={pending || !newName.trim()}>
            {pending ? "Adding..." : "Add Entity"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
