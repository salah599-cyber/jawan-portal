"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintTransferLetterButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => window.print()}
      className="print:hidden"
    >
      <Printer className="mr-2 h-4 w-4" />
      Print / Save PDF
    </Button>
  );
}
