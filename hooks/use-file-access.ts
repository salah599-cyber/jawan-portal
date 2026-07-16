"use client";

import { useEffect, useState } from "react";
import { getFileAccessForUser } from "@/lib/actions/file-download-requests";
import type { FileAccessContext } from "@/lib/files/download-types";
import type { FileKind } from "@/lib/files/href";

export function useFileAccess(files: Array<{ kind: FileKind; fileId: string }>) {
  const filesKey = files.map((file) => `${file.kind}:${file.fileId}`).join("|");
  const [state, setState] = useState<{ key: string; access: FileAccessContext } | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getFileAccessForUser(files.length === 0 ? [] : files)
      .then((access) => {
        if (!cancelled) {
          setState({ key: filesKey, access });
        }
      })
      .catch((error) => {
        console.error("Failed to load file access:", error);
        if (!cancelled) {
          setState({
            key: filesKey,
            access: { isSuperAdmin: false, downloadRequestStatuses: {} },
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [files, filesKey]);

  if (!state || state.key !== filesKey) {
    return null;
  }

  return state.access;
}
