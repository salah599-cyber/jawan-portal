"use client";

import { useTransition } from "react";
import { exportPublicHoldings } from "@/lib/actions/public-markets";
import type { PublicMarket } from "@/lib/generated/prisma/client";
import { downloadExcelBase64File } from "@/lib/spreadsheet/download-excel";
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
      downloadExcelBase64File(result);
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={pending}>
      <Download className="mr-2 h-4 w-4" />
      {pending ? "Exporting..." : "Export Excel"}
    </Button>
  );
}
