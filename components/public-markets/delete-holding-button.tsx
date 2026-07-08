"use client";

import { deletePublicHolding } from "@/lib/actions/public-markets";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";

export function DeletePublicHoldingButton({
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
      description={`Remove ${symbol} from the portfolio? Re-import the broker report or re-add manually to restore it.`}
      deleteAction={deletePublicHolding}
      size="icon"
    />
  );
}
