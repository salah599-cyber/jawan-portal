"use client";

import { useFileAccess } from "@/hooks/use-file-access";
import { FileActions } from "@/components/platform/file-actions";
import { fileRequestKey } from "@/lib/files/download-types";
import type { FileKind } from "@/lib/files/href";

export function FileActionsWithAccess({
  kind,
  fileId,
  fileName,
  files,
  compact,
}: {
  kind: FileKind;
  fileId: string;
  fileName: string;
  files: Array<{ kind: FileKind; fileId: string }>;
  compact?: boolean;
}) {
  const fileAccess = useFileAccess(files);

  if (!fileAccess) {
    return <span className="text-xs text-muted-foreground">Loading…</span>;
  }

  return (
    <FileActions
      kind={kind}
      fileId={fileId}
      fileName={fileName}
      isSuperAdmin={fileAccess.isSuperAdmin}
      requestStatus={fileAccess.downloadRequestStatuses[fileRequestKey(kind, fileId)]}
      compact={compact}
    />
  );
}
