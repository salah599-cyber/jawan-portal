"use client";

import { useTransition } from "react";
import type { PublicMarket } from "@/lib/generated/prisma/client";
import { downloadPublicMarketUploadTemplate } from "@/lib/actions/public-markets";
import { downloadExcelBase64File } from "@/lib/spreadsheet/download-excel";
import { Download } from "lucide-react";

export function DownloadUploadTemplateLink({
  market,
}: {
  market: Extract<PublicMarket, "MSX" | "USA">;
}) {
  const [pending, startTransition] = useTransition();

  function handleDownload() {
    startTransition(async () => {
      const result = await downloadPublicMarketUploadTemplate(market);
      downloadExcelBase64File(result);
    });
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={pending}
      className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline disabled:opacity-60"
    >
      <Download className="h-3 w-3" />
      {pending ? "Preparing template..." : "Download Excel template"}
    </button>
  );
}
