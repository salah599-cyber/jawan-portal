"use client";

import { useState, useTransition } from "react";
import { addCustomAssetType } from "@/lib/actions/assets";
import { ASSET_CATEGORY_LABELS } from "@/lib/labels";
import {
  encodeBuiltInAssetCategory,
  encodeCustomAssetType,
} from "@/lib/assets/category-display";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

export type CustomAssetTypeOption = { id: string; name: string };

export function AssetCategorySelect({
  customTypes,
  value,
  onValueChange,
  onTypeAdded,
}: {
  customTypes: CustomAssetTypeOption[];
  value: string;
  onValueChange: (value: string) => void;
  onTypeAdded?: (type: CustomAssetTypeOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAddType() {
    setError(null);
    startTransition(async () => {
      try {
        const type = await addCustomAssetType(newTypeName);
        onTypeAdded?.(type);
        onValueChange(encodeCustomAssetType(type.id));
        setNewTypeName("");
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add asset type.");
      }
    });
  }

  return (
    <div className="flex gap-2">
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Select category" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(ASSET_CATEGORY_LABELS).map(([category, label]) => (
            <SelectItem key={category} value={encodeBuiltInAssetCategory(category)}>
              {label}
            </SelectItem>
          ))}
          {customTypes.length > 0 ? (
            <SelectItem value="__custom_header__" disabled>
              Custom types
            </SelectItem>
          ) : null}
          {customTypes.map((type) => (
            <SelectItem key={type.id} value={encodeCustomAssetType(type.id)}>
              {type.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="icon" aria-label="Add custom asset type">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Asset Type</DialogTitle>
            <DialogDescription>
              Create a new asset type for categories not covered by the built-in options.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="newAssetType">Type name</Label>
            <Input
              id="newAssetType"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              placeholder="e.g. Collectibles"
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleAddType} disabled={pending || !newTypeName.trim()}>
              {pending ? "Adding..." : "Add Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
