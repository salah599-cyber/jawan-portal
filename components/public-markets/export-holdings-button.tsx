"use client";

import { useTransition } from "react";
import { exportPublicHoldings } from "@/lib/actions/public-markets";
import type { PublicMarket } from "@/lib/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function ExportHoldingsButton({
  entityId,
  market,
}: {
  entityId?: string;
  market?: PublicMarket | "ALL";
}) {
  const [pending, startTransition] = useTransition();

  function handleExport() {
    const formData = new FormData();
    if (entityId) formData.set("entityId", entityId);
    if (market) formData.set("market", market);

    startTransition(async () => {
      const result = await exportPublicHoldings(formData);
      const bytes = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.fileName;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={pending}>
      <Download className="mr-2 h-4 w-4" />
      {pending ? "Exporting..." : "Export Excel"}
    </Button>
  );
}
