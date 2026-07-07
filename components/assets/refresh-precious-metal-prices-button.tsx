"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshPreciousMetalPricesAction } from "@/lib/actions/assets";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function RefreshPreciousMetalPricesButton({ assetId }: { assetId?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleRefresh() {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      try {
        const result = await refreshPreciousMetalPricesAction(assetId);
        if (result.updated === 0 && result.failed > 0) {
          setError(
            `Could not refresh ${result.failed} holding${result.failed === 1 ? "" : "s"}. Check GOLD_API_KEY or try again later.`,
          );
        } else {
          setMessage(
            `Updated ${result.updated} holding${result.updated === 1 ? "" : "s"}` +
              (result.failed > 0 ? ` · ${result.failed} failed` : ""),
          );
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to refresh gold/silver prices.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="outline" size="sm" onClick={handleRefresh} disabled={pending}>
        <RefreshCw className={`mr-2 h-4 w-4 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Refreshing..." : assetId ? "Refresh Price" : "Refresh Gold/Silver Prices"}
      </Button>
      {message ? <p className="text-xs text-green-700">{message}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
