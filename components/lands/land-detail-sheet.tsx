"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { getLand } from "@/lib/actions/lands";
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
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !landId) {
      setLand(null);
      setError(null);
      return;
    }

    startTransition(async () => {
      try {
        const data = await getLand(landId);
        if (!data) {
          setError("Land parcel not found.");
          setLand(null);
          return;
        }
        setLand(data as LandDetailData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load land details.");
        setLand(null);
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
          ) : land ? (
            <LandDetailContent land={land} showActions={showActions} compact />
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
