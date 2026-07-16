"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { getLand } from "@/lib/actions/lands";
import { getFileAccessForUser } from "@/lib/actions/file-download-requests";
import { collectLandFileRefs } from "@/lib/files/download-types";
import type { FileAccessContext } from "@/lib/files/download-types";
import { formatLandLocation } from "@/lib/lands/location";
import { LandDetailContent, type LandDetailData } from "@/components/lands/land-detail-content";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function LandDetailSheet({
  landId,
  open,
  onOpenChange,
  showActions,
}: {
  landId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showActions: boolean;
}) {
  const [land, setLand] = useState<LandDetailData | null>(null);
  const [fileAccess, setFileAccess] = useState<FileAccessContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !landId) {
      return;
    }

    startTransition(async () => {
      setLand(null);
      setFileAccess(null);
      setError(null);
      try {
        const data = await getLand(landId);
        if (!data) {
          setError("Land parcel not found.");
          setLand(null);
          setFileAccess(null);
          return;
        }
        const access = await getFileAccessForUser(collectLandFileRefs(data));
        setLand(data as LandDetailData);
        setFileAccess(access);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load land details.");
        setLand(null);
        setFileAccess(null);
      }
    });
  }, [open, landId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl md:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{land?.name ?? "Land Details"}</SheetTitle>
          <SheetDescription>
            {land
              ? formatLandLocation(land)
              : pending
                ? "Loading parcel information..."
                : "Full land parcel information and documents"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 px-4 pb-6">
          {pending && !land ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : land && fileAccess ? (
            <LandDetailContent land={land} showActions={showActions} compact fileAccess={fileAccess} />
          ) : null}

          {landId && land ? (
            <div className="mt-4">
              <Button variant="link" className="h-auto p-0" asChild>
                <Link href={"/lands/" + landId} onClick={() => onOpenChange(false)}>
                  Open full page
                </Link>
              </Button>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
