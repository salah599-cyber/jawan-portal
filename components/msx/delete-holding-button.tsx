"use client";

import { deleteMsxHolding } from "@/lib/actions/msx-portfolio";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";

export function DeleteHoldingButton({
  holdingId,
  symbol,
}: {
  holdingId: string;
  symbol: string;
}) {
  return (
    <DeleteEntryButton
      itemId={holdingId}
      itemLabel={symbol}
      title="Remove holding?"
      description={`Remove ${symbol} from the MSX portfolio? Re-import the broker report to restore it.`}
      deleteAction={deleteMsxHolding}
      size="icon"
    />
  );
}
