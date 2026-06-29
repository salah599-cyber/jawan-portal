"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type DeleteEntryButtonProps = {
  itemLabel: string;
  title?: string;
  description?: string;
  deleteAction: (id: string) => Promise<void>;
  itemId: string;
  redirectTo?: string;
  size?: "sm" | "default" | "icon";
  disabled?: boolean;
  disabledReason?: string;
};

export function DeleteEntryButton({
  itemLabel,
  title = "Delete entry?",
  description,
  deleteAction,
  itemId,
  redirectTo,
  size = "sm",
  disabled = false,
  disabledReason,
}: DeleteEntryButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteAction(itemId);
        setOpen(false);
        if (redirectTo) {
          router.push(redirectTo);
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete entry.");
      }
    });
  }

  if (disabled) {
    return (
      <Button
        type="button"
        variant="ghost"
        size={size}
        disabled
        title={disabledReason}
        className="text-muted-foreground"
      >
        <Trash2 className="size-4" />
      </Button>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={size}
          className="text-destructive hover:text-destructive"
          aria-label={"Delete " + itemLabel}
        >
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description ??
              "This will permanently delete \"" + itemLabel + "\". This action cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={pending}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {pending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
