"use client";

import { useState, useTransition } from "react";
import { addAssetCategory } from "@/lib/actions/asset-categories";
import { ASSET_CATEGORY_LABELS } from "@/lib/labels";
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
import type { AssetCategoryOption } from "@/lib/data/asset-categories";
import type { AssetCategory } from "@/lib/generated/prisma/client";

export function AssetCategorySelect({
  categories,
  value,
  onValueChange,
  onCategoryAdded,
  canAdd = true,
}: {
  categories: AssetCategoryOption[];
  value: string;
  onValueChange: (value: string) => void;
  onCategoryAdded?: (category: AssetCategoryOption) => void;
  canAdd?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [baseType, setBaseType] = useState<AssetCategory>("OTHER");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAddCategory() {
    setError(null);
    startTransition(async () => {
      try {
        const category = await addAssetCategory(newCategoryName, baseType);
        onCategoryAdded?.(category);
        onValueChange(category.id);
        setNewCategoryName("");
        setBaseType("OTHER");
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add category.");
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
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {canAdd ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="icon" aria-label="Add asset category">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Asset Category</DialogTitle>
              <DialogDescription>
                Create a custom label for grouping assets. Choose the base type that controls how the
                asset is stored.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newAssetCategoryName">Category name</Label>
                <Input
                  id="newAssetCategoryName"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Luxury Watches"
                />
              </div>
              <div className="space-y-2">
                <Label>Base type</Label>
                <Select value={baseType} onValueChange={(v) => setBaseType(v as AssetCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ASSET_CATEGORY_LABELS).map(([kind, label]) => (
                      <SelectItem key={kind} value={kind}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAddCategory}
                disabled={pending || !newCategoryName.trim()}
              >
                {pending ? "Adding..." : "Add Category"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
