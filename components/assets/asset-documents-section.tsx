"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAssetDocument, setPrimaryAssetPhoto } from "@/lib/actions/assets";
import { ASSET_DOCUMENT_TYPE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AssetDocumentRow = {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  isPrimary: boolean;
  notes: string | null;
  createdAt: Date;
};

function isImageMime(mimeType: string) {
  return mimeType.startsWith("image/");
}

function DocumentList({
  documents,
  canEdit,
}: {
  documents: AssetDocumentRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground">No files uploaded yet.</p>;
  }

  return (
    <div className="space-y-2">
      {documents.map((document) => (
        <div
          key={document.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
        >
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-medium">{document.fileName}</p>
              {document.isPrimary ? <Badge variant="secondary">Primary</Badge> : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {ASSET_DOCUMENT_TYPE_LABELS[document.documentType] ?? document.documentType} ·{" "}
              {formatDate(document.createdAt)}
              {document.notes ? ` · ${document.notes}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={document.fileUrl} target="_blank" rel="noreferrer">
                Open
              </a>
            </Button>
            {canEdit && document.documentType === "PHOTO" && !document.isPrimary ? (
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await setPrimaryAssetPhoto(document.id);
                    router.refresh();
                  })
                }
              >
                Set primary
              </Button>
            ) : null}
            {canEdit ? (
              <DeleteEntryButton
                itemId={document.id}
                itemLabel={document.fileName}
                deleteAction={deleteAssetDocument}
              />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AssetDocumentsSection({
  documents,
  canEdit,
}: {
  documents: AssetDocumentRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const photos = documents.filter((d) => d.documentType === "PHOTO");
  const otherGroups = ["WARRANTY", "INVOICE", "RECEIPT", "MANUAL", "OTHER"] as const;

  return (
    <div className="space-y-4">
      {photos.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Photos</CardTitle>
            <CardDescription>Asset images and primary photo for quick identification.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((photo) => (
                <div key={photo.id} className="overflow-hidden rounded-lg border">
                  <a href={photo.fileUrl} target="_blank" rel="noreferrer" className="block">
                    {isImageMime(photo.mimeType) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo.fileUrl}
                        alt={photo.fileName}
                        className="aspect-[4/3] w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-[4/3] items-center justify-center bg-muted text-sm text-muted-foreground">
                        {photo.fileName}
                      </div>
                    )}
                  </a>
                  <div className="flex items-center justify-between gap-2 border-t p-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{photo.fileName}</p>
                      {photo.isPrimary ? (
                        <p className="text-xs text-muted-foreground">Primary photo</p>
                      ) : null}
                    </div>
                    {canEdit ? (
                      <div className="flex items-center gap-1">
                        {!photo.isPrimary ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={pending}
                            onClick={() =>
                              startTransition(async () => {
                                await setPrimaryAssetPhoto(photo.id);
                                router.refresh();
                              })
                            }
                          >
                            Primary
                          </Button>
                        ) : null}
                        <DeleteEntryButton
                          itemId={photo.id}
                          itemLabel={photo.fileName}
                          deleteAction={deleteAssetDocument}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {otherGroups.map((type) => {
        const group = documents.filter((d) => d.documentType === type);
        if (group.length === 0) return null;
        return (
          <Card key={type}>
            <CardHeader>
              <CardTitle>{ASSET_DOCUMENT_TYPE_LABELS[type]}</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentList documents={group} canEdit={canEdit} />
            </CardContent>
          </Card>
        );
      })}

      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Upload photos, warranty cards, invoices, and other supporting documents for this asset.
        </p>
      ) : null}
    </div>
  );
}
