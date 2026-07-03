"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshPublicMarketPricesAction } from "@/lib/actions/public-markets";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function RefreshPricesButton({
  entityId,
  market,
  disabled = false,
}: {
  entityId?: string;
  market: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleRefresh() {
    setMessage(null);
    setError(null);

    const formData = new FormData();
    if (entityId) formData.set("entityId", entityId);
    formData.set("market", market);

    startTransition(async () => {
      try {
        const result = await refreshPublicMarketPricesAction(formData);
        setMessage(
          `Updated ${result.updated} holding${result.updated === 1 ? "" : "s"}` +
            (result.skipped > 0 ? ` · ${result.skipped} MSX skipped` : "") +
            (result.failed > 0 ? ` · ${result.failed} failed` : ""),
        );
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to refresh prices.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={pending || disabled}
      >
        <RefreshCw className={`mr-2 h-4 w-4 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Refreshing..." : "Refresh Live Prices"}
      </Button>
      {message ? <p className="text-xs text-green-700">{message}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
