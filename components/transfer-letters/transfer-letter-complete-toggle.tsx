"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { updateTransferLetterStatus } from "@/lib/actions/transfer-letters";
import type { TransferLetterStatus } from "@/lib/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TransferLetterCompleteToggle({
  letterId,
  status,
  canEdit,
  className,
}: {
  letterId: string;
  status: TransferLetterStatus;
  canEdit: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isComplete = status === "COMPLETE";

  function toggle() {
    if (!canEdit || pending) return;

    const nextStatus: TransferLetterStatus = isComplete ? "PENDING" : "COMPLETE";
    startTransition(async () => {
      await updateTransferLetterStatus(letterId, nextStatus);
      router.refresh();
    });
  }

  if (!canEdit && !isComplete) {
    return <Circle className={cn("h-5 w-5 text-muted-foreground/40", className)} aria-hidden />;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8 shrink-0", className)}
      onClick={toggle}
      disabled={!canEdit || pending}
      title={isComplete ? "Mark as pending" : "Mark transfer complete"}
      aria-label={isComplete ? "Mark as pending" : "Mark transfer complete"}
    >
      {isComplete ? (
        <CheckCircle2 className="h-5 w-5 text-green-600" />
      ) : (
        <Circle className="h-5 w-5 text-muted-foreground" />
      )}
    </Button>
  );
}
