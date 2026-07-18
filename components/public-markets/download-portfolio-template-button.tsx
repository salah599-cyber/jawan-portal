"use client";

import { useTransition } from "react";
import { downloadPortfolioUploadTemplate } from "@/lib/actions/public-markets";
import { downloadExcelBase64File } from "@/lib/spreadsheet/download-excel";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function DownloadPortfolioTemplateButton() {
  const [pending, startTransition] = useTransition();

  function handleDownload() {
    startTransition(async () => {
      const result = await downloadPortfolioUploadTemplate();
      downloadExcelBase64File(result);
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDownload} disabled={pending}>
      <Download className="mr-2 h-4 w-4" />
      {pending ? "Preparing..." : "Download Portfolio Template"}
    </Button>
  );
}
