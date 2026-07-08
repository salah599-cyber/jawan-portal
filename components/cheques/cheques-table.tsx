"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { usePagination } from "@/hooks/use-pagination";
import { TableSearchInput } from "@/components/platform/table-search-input";
import { TablePagination } from "@/components/platform/table-pagination";
import { RowActions } from "@/components/platform/row-actions";
import { deleteCheque, type listCheques } from "@/lib/actions/cheques";
import { CHEQUE_DIRECTION_LABELS, CHEQUE_STATUS_LABELS } from "@/lib/labels";
import { formatMoney, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Cheque = Awaited<ReturnType<typeof listCheques>>[number];

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "CLEARED") return "default";
  if (status === "BOUNCED" || status === "STOPPED") return "destructive";
  if (status === "CANCELLED") return "outline";
  return "secondary";
}

export function ChequesTable({ cheques, showAdd }: { cheques: Cheque[]; showAdd: boolean }) {
  const getSearchText = useCallback(
    (cheque: Cheque) =>
      [
        cheque.chequeNumber,
        cheque.payee,
        cheque.entity.name,
        cheque.bankAccount?.bankName,
        cheque.bankName,
        cheque.status,
        cheque.direction,
      ]
        .filter(Boolean)
        .join(" "),
    [],
  );
  const { query, setQuery, filtered } = useSearchFilter(cheques, getSearchText);
  const { page, setPage, pageCount, paged, total, pageSize } = usePagination(filtered, { resetKey: query });

  if (cheques.length === 0) {
    return <p className="text-sm text-muted-foreground">No cheques registered yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <TableSearchInput value={query} onChange={setQuery} placeholder="Search cheques..." />
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No cheques match your search.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cheque #</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>Payee / Payer</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Issue</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Docs</TableHead>
              {showAdd ? <TableHead className="w-[60px]">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((cheque) => (
              <TableRow key={cheque.id}>
                <TableCell className="font-medium">
                  <Link href={"/cheques/" + cheque.id} className="hover:underline">
                    {cheque.chequeNumber}
                  </Link>
                </TableCell>
                <TableCell>{CHEQUE_DIRECTION_LABELS[cheque.direction] ?? cheque.direction}</TableCell>
                <TableCell>{cheque.payee}</TableCell>
                <TableCell>{cheque.entity.name}</TableCell>
                <TableCell>{cheque.bankAccount ? cheque.bankAccount.bankName : cheque.bankName ?? "-"}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(cheque.status)}>
                    {CHEQUE_STATUS_LABELS[cheque.status] ?? cheque.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{formatMoney(cheque.amount, cheque.currency)}</TableCell>
                <TableCell>{formatDate(cheque.issueDate)}</TableCell>
                <TableCell>{formatDate(cheque.dueDate)}</TableCell>
                <TableCell>{cheque.documents.length}</TableCell>
                {showAdd ? (
                  <TableCell>
                    <RowActions
                      editHref={"/cheques/" + cheque.id + "/edit"}
                      itemId={cheque.id}
                      itemLabel={"Cheque #" + cheque.chequeNumber}
                      deleteAction={deleteCheque}
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
