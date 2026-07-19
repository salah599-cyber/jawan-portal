import { PUBLIC_HOLDING_SOURCE_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";

export function HoldingSourceBadge({ source }: { source: string }) {
  const label = PUBLIC_HOLDING_SOURCE_LABELS[source] ?? source;
  const variant = source === "IMPORT" ? "default" : "secondary";

  return (
    <Badge variant={variant} className="whitespace-nowrap">
      {label}
    </Badge>
  );
}

export function DuplicateSymbolBadge() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="border-amber-500 text-amber-700"
            aria-label="Duplicate symbol"
          >
            <AlertTriangle className="mr-1 h-3 w-3" />
            Duplicate
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Another holding with this symbol exists in the same market.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
