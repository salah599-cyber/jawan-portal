"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { usePagination } from "@/hooks/use-pagination";
import { TableSearchInput } from "@/components/platform/table-search-input";
import { TablePagination } from "@/components/platform/table-pagination";
import { RowActions } from "@/components/platform/row-actions";
import { deleteAsset, type listAssets } from "@/lib/actions/assets";
import { ASSET_CATEGORY_LABELS, ASSET_STATUS_LABELS } from "@/lib/labels";
import { formatMoney, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Asset = Awaited<ReturnType<typeof listAssets>>[number];

export function AssetsTable({
  assets,
  showAdd,
  emptyMessage,
}: {
  assets: Asset[];
  showAdd: boolean;
  emptyMessage: string;
}) {
  const getSearchText = useCallback(
    (asset: Asset) => [asset.name, asset.category, asset.entity.name, asset.status].filter(Boolean).join(" "),
    [],
  );
  const { query, setQuery, filtered } = useSearchFilter(assets, getSearchText);
  const { page, setPage, pageCount, paged, total, pageSize } = usePagination(filtered, { resetKey: query });

  if (assets.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <TableSearchInput value={query} onChange={setQuery} placeholder="Search assets..." />
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No assets match your search.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Acquired</TableHead>
              <TableHead className="text-right">Current Value</TableHead>
              <TableHead>Updated</TableHead>
              {showAdd ? <TableHead className="w-[60px]">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((asset) => {
              const linkedModule = asset.landParcel
                ? "Lands"
                : asset.vehicle
                  ? "Cars"
                  : asset.registeredCompany
                    ? "Companies"
                    : null;

              return (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">
                    <Link href={"/assets/" + asset.id} className="hover:underline">
                      {asset.name}
                    </Link>
                  </TableCell>
                  <TableCell>{ASSET_CATEGORY_LABELS[asset.category] ?? asset.category}</TableCell>
                  <TableCell>{asset.entity.name}</TableCell>
                  <TableCell>
                    <Badge variant={asset.status === "EXITED" ? "outline" : "secondary"}>
                      {ASSET_STATUS_LABELS[asset.status] ?? asset.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(asset.acquisitionDate)}</TableCell>
                  <TableCell className="text-right">
                    {formatMoney(asset.currentValue, asset.currency)}
                  </TableCell>
                  <TableCell>{formatDate(asset.updatedAt)}</TableCell>
                  {showAdd ? (
                    <TableCell>
                      <RowActions
                        editHref={linkedModule ? undefined : "/assets/" + asset.id + "/edit"}
                        itemId={asset.id}
                        itemLabel={asset.name}
                        deleteAction={deleteAsset}
                        disableDelete={!!linkedModule}
                        disabledReason={
                          linkedModule
                            ? "Linked to a " +
                              (asset.landParcel ? "land parcel" : asset.vehicle ? "vehicle" : "company") +
                              ". Manage from " +
                              linkedModule +
                              " instead."
                            : undefined
                        }
                      />
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      <TablePagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPageChange={setPage} />
    </div>
  );
}
