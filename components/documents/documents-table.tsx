"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { usePagination } from "@/hooks/use-pagination";
import { TableSearchInput } from "@/components/platform/table-search-input";
import { TablePagination } from "@/components/platform/table-pagination";
import { RowActions } from "@/components/platform/row-actions";
import { deleteDocument } from "@/lib/actions/documents";
import { fileHref } from "@/lib/files/href";
import { DOCUMENT_STATUS_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DocumentRow = {
  id: string;
  name: string;
  status: string;
  category: { name: string };
  entity: { name: string } | null;
  expiryDate: Date | string | null;
  createdAt: Date | string;
};

type ExpiryFilter = "all" | "expiring" | "expired";

const EXPIRING_SOON_DAYS = 30;

function expiryState(expiryDate: Date | string | null): "expired" | "expiring" | null {
  if (!expiryDate) return null;
  const date = new Date(expiryDate);
  const now = new Date();
  if (date.getTime() < now.getTime()) return "expired";
  const soon = new Date(now);
  soon.setDate(soon.getDate() + EXPIRING_SOON_DAYS);
  if (date.getTime() <= soon.getTime()) return "expiring";
  return null;
}

export function DocumentsTable({ documents, showUpload }: { documents: DocumentRow[]; showUpload: boolean }) {
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>("all");

  const expiryFiltered = useMemo(() => {
    if (expiryFilter === "all") return documents;
    return documents.filter((doc) => expiryState(doc.expiryDate) === expiryFilter);
  }, [documents, expiryFilter]);

  const expiringCount = useMemo(
    () => documents.filter((doc) => expiryState(doc.expiryDate) === "expiring").length,
    [documents],
  );
  const expiredCount = useMemo(
    () => documents.filter((doc) => expiryState(doc.expiryDate) === "expired").length,
    [documents],
  );

  const getSearchText = useCallback(
    (doc: DocumentRow) => [doc.name, doc.category.name, doc.entity?.name, doc.status].filter(Boolean).join(" "),
    [],
  );
  const { query, setQuery, filtered } = useSearchFilter(expiryFiltered, getSearchText);
  const { page, setPage, pageCount, paged, total, pageSize } = usePagination(filtered, {
    resetKey: query + expiryFilter,
  });

  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <TableSearchInput value={query} onChange={setQuery} placeholder="Search documents..." />
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={expiryFilter === "all" ? "secondary" : "ghost"}
            onClick={() => setExpiryFilter("all")}
          >
            All ({documents.length})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={expiryFilter === "expiring" ? "secondary" : "ghost"}
            onClick={() => setExpiryFilter("expiring")}
          >
            Expiring soon ({expiringCount})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={expiryFilter === "expired" ? "secondary" : "ghost"}
            onClick={() => setExpiryFilter("expired")}
          >
            Expired ({expiredCount})
          </Button>
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents match your search.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Uploaded</TableHead>
              {showUpload ? <TableHead className="w-[60px]">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">
                  <a
                    href={fileHref("document", doc.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {doc.name}
                  </a>
                </TableCell>
                <TableCell>{doc.category.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {DOCUMENT_STATUS_LABELS[doc.status as keyof typeof DOCUMENT_STATUS_LABELS] ?? doc.status}
                  </Badge>
                </TableCell>
                <TableCell>{doc.entity?.name ?? "—"}</TableCell>
                <TableCell
                  className={cn(
                    expiryState(doc.expiryDate) === "expired" && "font-medium text-destructive",
                    expiryState(doc.expiryDate) === "expiring" && "font-medium text-amber-600",
                  )}
                >
                  {formatDate(doc.expiryDate)}
                </TableCell>
                <TableCell>{formatDate(doc.createdAt)}</TableCell>
                {showUpload ? (
                  <TableCell>
                    <RowActions
                      editHref={"/documents/" + doc.id + "/edit"}
                      itemId={doc.id}
                      itemLabel={doc.name}
                      deleteAction={deleteDocument}
                    />
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <TablePagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPageChange={setPage} />
    </div>
  );
}
