"use client";

import { useMemo, useState } from "react";
import {
  loadCustomBankDivisions,
  mergeBankDivisions,
  saveCustomBankDivisions,
} from "@/lib/transfer/constants";
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

export function BankDivisionSelect({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
}) {
  const [customDivisions, setCustomDivisions] = useState<string[]>(() => loadCustomBankDivisions());
  const [open, setOpen] = useState(false);
  const [newDivision, setNewDivision] = useState("");
  const [error, setError] = useState<string | null>(null);

  const divisions = useMemo(() => {
    const extras =
      value.trim() && !mergeBankDivisions(customDivisions).some((division) => division === value.trim())
        ? [value.trim()]
        : [];
    return mergeBankDivisions([...customDivisions, ...extras]);
  }, [customDivisions, value]);

  function handleAddDivision() {
    const trimmed = newDivision.trim();
    if (!trimmed) {
      setError("Enter a division name.");
      return;
    }

    const exists = divisions.some((division) => division.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setError("This division already exists.");
      return;
    }

    const nextCustom = [...customDivisions, trimmed];
    setCustomDivisions(nextCustom);
    saveCustomBankDivisions(nextCustom);
    onValueChange(trimmed);
    setNewDivision("");
    setError(null);
    setOpen(false);
  }

  return (
    <div className="space-y-2">
      <Label>Bank Division</Label>
      <div className="flex gap-2">
        <Select value={value || undefined} onValueChange={onValueChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select division" />
          </SelectTrigger>
          <SelectContent>
            {divisions.map((division) => (
              <SelectItem key={division} value={division}>
                {division}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="icon" aria-label="Add bank division">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Bank Division</DialogTitle>
              <DialogDescription>
                Add a custom division to reuse on future transfer letters.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="newBankDivision">Division name</Label>
              <Input
                id="newBankDivision"
                value={newDivision}
                onChange={(e) => {
                  setNewDivision(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. Wealth Management"
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
            <DialogFooter>
              <Button type="button" onClick={handleAddDivision}>
                Add Division
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <input type="hidden" name="sourceBranch" value={value} />
    </div>
  );
}
