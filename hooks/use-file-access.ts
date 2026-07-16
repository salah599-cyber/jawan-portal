"use client";

import { useEffect, useState } from "react";
import { getFileAccessForUser } from "@/lib/actions/file-download-requests";
import type { FileAccessContext } from "@/lib/files/download-types";
import type { FileKind } from "@/lib/files/href";

export function useFileAccess(files: Array<{ kind: FileKind; fileId: string }>) {
  const [fileAccess, setFileAccess] = useState<FileAccessContext | null>(null);
  const filesKey = files.map((file) => `${file.kind}:${file.fileId}`).join("|");

  useEffect(() => {
    let cancelled = false;
    setFileAccess(null);

    if (files.length === 0) {
      void getFileAccessForUser([]).then((access) => {
        if (!cancelled) setFileAccess(access);
      });
      return () => {
        cancelled = true;
      };
    }

    void getFileAccessForUser(files).then((access) => {
      if (!cancelled) setFileAccess(access);
    });

    return () => {
      cancelled = true;
    };
  }, [filesKey]);

  return fileAccess;
}
