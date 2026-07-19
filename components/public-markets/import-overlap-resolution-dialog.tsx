"use client";

import type { ManualOverlapDetail, OverlapResolutionStrategy } from "@/lib/public-markets/overlap-resolution";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const RESOLUTION_OPTIONS: Array<{
  value: OverlapResolutionStrategy;
  title: string;
  description: string;
}> = [
  {
    value: "keep_manual",
    title: "Keep manual entries",
    description: "Skip overlapping symbols from the import. Your manual positions stay unchanged.",
  },
  {
    value: "replace_manual",
    title: "Replace with managed import",
    description: "Delete manual entries for overlapping symbols and use the manager file instead.",
  },
  {
    value: "merge",
    title: "Merge quantities",
    description: "Combine manual and managed quantities into one managed holding per symbol.",
  },
];

export function ImportOverlapResolutionDialog({
  open,
  overlaps,
  strategy,
  pending,
  onStrategyChange,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  overlaps: ManualOverlapDetail[];
  strategy: OverlapResolutionStrategy;
  pending?: boolean;
  onStrategyChange: (strategy: OverlapResolutionStrategy) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Resolve manual vs managed overlaps</AlertDialogTitle>
          <AlertDialogDescription>
            {overlaps.length} symbol{overlaps.length === 1 ? "" : "s"} exist both as manual entries
            and in the file you are importing. Choose how to handle them.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="max-h-48 overflow-y-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Symbol</th>
                <th className="px-3 py-2 text-right font-medium">Manual qty</th>
                <th className="px-3 py-2 text-right font-medium">Import qty</th>
              </tr>
            </thead>
            <tbody>
              {overlaps.map((overlap) => (
                <tr key={overlap.symbol} className="border-t">
                  <td className="px-3 py-2 font-medium">{overlap.symbol}</td>
                  <td className="px-3 py-2 text-right">{overlap.manualQuantity}</td>
                  <td className="px-3 py-2 text-right">{overlap.importedQuantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3">
          <Label>Resolution</Label>
          <div className="grid gap-2">
            {RESOLUTION_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-md border p-3 transition-colors",
                  strategy === option.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40",
                )}
              >
                <input
                  type="radio"
                  name="overlap-resolution"
                  value={option.value}
                  checked={strategy === option.value}
                  onChange={() => onStrategyChange(option.value)}
                  className="mt-1"
                />
                <span className="space-y-1">
                  <span className="block text-sm font-medium">{option.title}</span>
                  <span className="block text-sm text-muted-foreground">{option.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending} onClick={onCancel}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={onConfirm}>
            {pending ? "Importing..." : "Continue import"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
