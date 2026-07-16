"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createFileDownloadRequest } from "@/lib/actions/file-download-requests";
import {
  FILE_DOWNLOAD_REQUEST_STATUS_LABELS,
  MIN_DOWNLOAD_REQUEST_REASON_LENGTH,
  fileRequestKey,
  type FileDownloadRequestStatus,
} from "@/lib/files/download-types";
import { fileHref, type FileKind } from "@/lib/files/href";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Download, ExternalLink } from "lucide-react";

export function FileActions({
  kind,
  fileId,
  fileName,
  isSuperAdmin,
  requestStatus,
  compact = false,
}: {
  kind: FileKind;
  fileId: string;
  fileName: string;
  isSuperAdmin: boolean;
  requestStatus?: FileDownloadRequestStatus | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const status = requestStatus ?? null;
  const buttonSize = compact ? "sm" : "sm";

  function submitRequest() {
    setError(null);
    startTransition(async () => {
      try {
        await createFileDownloadRequest({ kind, fileId, reason });
        setReason("");
        setDialogOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit download request.");
      }
    });
  }

  if (isSuperAdmin) {
    return (
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="outline" size={buttonSize} asChild>
          <a href={fileHref(kind, fileId)} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-1 size-4" />
            Open
          </a>
        </Button>
        <Button variant="outline" size={buttonSize} asChild>
          <a href={fileHref(kind, fileId, { download: true })}>
            <Download className="mr-1 size-4" />
            Download
          </a>
        </Button>
      </div>
    );
  }

  if (status === "APPROVED") {
    return (
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="default" size={buttonSize} asChild>
          <a href={fileHref(kind, fileId, { download: true })}>
            <Download className="mr-1 size-4" />
            Download
          </a>
        </Button>
        <span className="text-xs text-muted-foreground">One-time download</span>
      </div>
    );
  }

  if (status === "PENDING") {
    return (
      <Button variant="secondary" size={buttonSize} disabled>
        Pending approval
      </Button>
    );
  }

  const canRequest = status === null || status === "REJECTED" || status === "DOWNLOADED";

  return (
    <div className="flex flex-col items-end gap-1">
      {status === "REJECTED" ? (
        <span className="text-xs text-destructive">{FILE_DOWNLOAD_REQUEST_STATUS_LABELS.REJECTED}</span>
      ) : null}
      {status === "DOWNLOADED" ? (
        <span className="text-xs text-muted-foreground">{FILE_DOWNLOAD_REQUEST_STATUS_LABELS.DOWNLOADED}</span>
      ) : null}
      {canRequest ? (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size={buttonSize} type="button">
              Request download
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request file download</DialogTitle>
              <DialogDescription>
                A super admin must approve your request before you can download{" "}
                <span className="font-medium text-foreground">{fileName}</span>. Downloads are
                single-use after approval.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor={`reason-${fileRequestKey(kind, fileId)}`}>Reason (required)</Label>
              <Textarea
                id={`reason-${fileRequestKey(kind, fileId)}`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you need this file..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Minimum {MIN_DOWNLOAD_REQUEST_REASON_LENGTH} characters.
              </p>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                disabled={pending || reason.trim().length < MIN_DOWNLOAD_REQUEST_REASON_LENGTH}
                onClick={submitRequest}
              >
                {pending ? "Submitting..." : "Submit request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

export function FileNameDisplay({
  fileName,
  kind,
  fileId,
  isSuperAdmin,
}: {
  fileName: string;
  kind: FileKind;
  fileId: string;
  isSuperAdmin: boolean;
}) {
  if (isSuperAdmin) {
    return (
      <a
        href={fileHref(kind, fileId)}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline"
      >
        {fileName}
      </a>
    );
  }

  return <span>{fileName}</span>;
}
