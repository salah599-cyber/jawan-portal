"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { usePagination } from "@/hooks/use-pagination";
import { TableSearchInput } from "@/components/platform/table-search-input";
import { TablePagination } from "@/components/platform/table-pagination";
import { RowActions } from "@/components/platform/row-actions";
import { deleteTransferLetter, type listTransferLetters } from "@/lib/actions/transfer-letters";
import { TRANSFER_LETTER_TYPE_LABELS } from "@/lib/labels";
import { formatMoney, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type TransferLetter = Awaited<ReturnType<typeof listTransferLetters>>[number];

export function TransferLettersTable({
  letters,
  showActions,
}: {
  letters: TransferLetter[];
  showActions: boolean;
}) {
  const getSearchText = useCallback(
    (letter: TransferLetter) =>
      [
        letter.beneficiaryName,
        letter.beneficiaryBankName,
        letter.sourceBankName,
        letter.entity.name,
        letter.type,
        letter.currency,
        letter.purpose,
      ]
        .filter(Boolean)
        .join(" "),
    [],
  );
  const { query, setQuery, filtered } = useSearchFilter(letters, getSearchText);
  const { page, setPage, pageCount, paged, total, pageSize } = usePagination(filtered, { resetKey: query });

  if (letters.length === 0) {
    return <p className="text-sm text-muted-foreground">No transfer letters recorded yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <TableSearchInput value={query} onChange={setQuery} placeholder="Search transfer letters..." />
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No transfer letters match your search.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Beneficiary</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Source Bank</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              {showActions ? <TableHead className="w-[60px]">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((letter) => (
              <TableRow key={letter.id}>
                <TableCell>
                  <Link href={"/transfer-letters/" + letter.id} className="font-medium hover:underline">
                    {formatDate(letter.letterDate)}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {TRANSFER_LETTER_TYPE_LABELS[letter.type] ?? letter.type}
                  </Badge>
                </TableCell>
                <TableCell>{letter.beneficiaryName}</TableCell>
                <TableCell>{letter.entity.name}</TableCell>
                <TableCell>{letter.sourceBankName}</TableCell>
                <TableCell className="text-right">{formatMoney(letter.amount, letter.currency)}</TableCell>
                {showActions ? (
                  <TableCell>
                    <RowActions
                      editHref={"/transfer-letters/" + letter.id + "/edit"}
                      itemId={letter.id}
                      itemLabel={letter.beneficiaryName}
                      deleteAction={deleteTransferLetter}
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
