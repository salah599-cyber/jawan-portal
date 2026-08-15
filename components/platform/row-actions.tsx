import { EditLinkButton } from "@/components/platform/edit-link-button";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";

export function RowActions({
  editHref,
  editLabel,
  deleteAction,
  itemId,
  itemLabel,
  redirectTo,
  disableEdit,
  disableDelete,
  disabledReason,
}: {
  editHref?: string;
  editLabel?: string;
  deleteAction: (id: string) => Promise<void>;
  itemId: string;
  itemLabel: string;
  redirectTo?: string;
  disableEdit?: boolean;
  disableDelete?: boolean;
  disabledReason?: string;
}) {
  return (
    <div className="flex items-center justify-end gap-0">
      {editHref && !disableEdit ? <EditLinkButton href={editHref} label={editLabel} /> : null}
      <DeleteEntryButton
        itemId={itemId}
        itemLabel={itemLabel}
        deleteAction={deleteAction}
        redirectTo={redirectTo}
        disabled={disableDelete}
        disabledReason={disabledReason}
      />
    </div>
  );
}
