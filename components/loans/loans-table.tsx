"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { usePagination } from "@/hooks/use-pagination";
import { TableSearchInput } from "@/components/platform/table-search-input";
import { TablePagination } from "@/components/platform/table-pagination";
import { RowActions } from "@/components/platform/row-actions";
import { deleteLoan, type listLoans } from "@/lib/actions/loans";
import { LIABILITY_STATUS_LABELS, LIABILITY_TYPE_LABELS, PAYMENT_FREQUENCY_LABELS } from "@/lib/labels";
import { formatMoney, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Loan = Awaited<ReturnType<typeof listLoans>>[number];

function loanBalance(loan: Loan) {
  return loan.outstandingBalance ?? loan.amount;
}

export function LoansTable({ loans, showAdd }: { loans: Loan[]; showAdd: boolean }) {
  const getSearchText = useCallback(
    (loan: Loan) => [loan.name, loan.lender, loan.entity.name, loan.type, loan.status].filter(Boolean).join(" "),
    [],
  );
  const { query, setQuery, filtered } = useSearchFilter(loans, getSearchText);
  const { page, setPage, pageCount, paged, total, pageSize } = usePagination(filtered, { resetKey: query });

  if (loans.length === 0) {
    return <p className="text-sm text-muted-foreground">No loans registered yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <TableSearchInput value={query} onChange={setQuery} placeholder="Search loans..." />
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No loans match your search.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Loan</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Lender</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Maturity</TableHead>
              <TableHead>Last Payment</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Docs</TableHead>
              {showAdd ? <TableHead className="w-[60px]">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((loan) => (
              <TableRow key={loan.id}>
                <TableCell className="font-medium">
                  <Link href={"/loans/" + loan.id} className="hover:underline">
                    {loan.name}
                  </Link>
                </TableCell>
                <TableCell>{LIABILITY_TYPE_LABELS[loan.type] ?? loan.type}</TableCell>
                <TableCell>{loan.lender ?? "-"}</TableCell>
                <TableCell>{loan.entity.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{LIABILITY_STATUS_LABELS[loan.status] ?? loan.status}</Badge>
                </TableCell>
                <TableCell className="text-right">{formatMoney(loanBalance(loan), loan.currency)}</TableCell>
                <TableCell>{loan.interestRate ? loan.interestRate.toString() + "%" : "-"}</TableCell>
                <TableCell>{formatDate(loan.maturityDate)}</TableCell>
                <TableCell>{formatDate(loan.lastPaymentAt)}</TableCell>
                <TableCell>
                  {loan.paymentAmount
                    ? formatMoney(loan.paymentAmount, loan.currency) +
                      (loan.paymentFrequency
                        ? " / " + (PAYMENT_FREQUENCY_LABELS[loan.paymentFrequency] ?? loan.paymentFrequency)
                        : "")
                    : "-"}
                </TableCell>
                <TableCell>{loan.documents.length}</TableCell>
                {showAdd ? (
                  <TableCell>
                    <RowActions
                      editHref={"/loans/" + loan.id + "/edit"}
                      itemId={loan.id}
                      itemLabel={loan.name}
                      deleteAction={deleteLoan}
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
