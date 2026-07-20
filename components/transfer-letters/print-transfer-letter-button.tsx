"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

const PRINT_PAGE_STYLE_ID = "transfer-letter-print-page";

function printTransferLetter() {
  const previousTitle = document.title;
  document.title = " ";
  document.body.classList.add("transfer-letter-print");

  let pageStyle = document.getElementById(PRINT_PAGE_STYLE_ID) as HTMLStyleElement | null;
  if (!pageStyle) {
    pageStyle = document.createElement("style");
    pageStyle.id = PRINT_PAGE_STYLE_ID;
    pageStyle.textContent = "@page { margin: 0; size: A4; }";
    document.head.appendChild(pageStyle);
  }

  const cleanup = () => {
    document.title = previousTitle;
    document.body.classList.remove("transfer-letter-print");
    pageStyle?.remove();
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);
  window.print();
}

export function PrintTransferLetterButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={printTransferLetter}
      className="print:hidden"
    >
      <Printer className="mr-2 h-4 w-4" />
      Print / Save PDF
    </Button>
  );
}
