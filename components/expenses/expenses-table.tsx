"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { usePagination } from "@/hooks/use-pagination";
import { TableSearchInput } from "@/components/platform/table-search-input";
import { TablePagination } from "@/components/platform/table-pagination";
import { RowActions } from "@/components/platform/row-actions";
import { deleteExpense, type listExpenses } from "@/lib/actions/expenses";
import { EXPENSE_STATUS_LABELS } from "@/lib/labels";
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

type Expense = Awaited<ReturnType<typeof listExpenses>>[number];

export function ExpensesTable({ expenses, showCreate }: { expenses: Expense[]; showCreate: boolean }) {
  const getSearchText = useCallback(
    (expense: Expense) =>
      [expense.title, expense.expenseType?.name, expense.category, expense.status, expense.entity?.name]
        .filter(Boolean)
        .join(" "),
    [],
  );
  const { query, setQuery, filtered } = useSearchFilter(expenses, getSearchText);
  const { page, setPage, pageCount, paged, total, pageSize } = usePagination(filtered, { resetKey: query });

  if (expenses.length === 0) {
    return <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <TableSearchInput value={query} onChange={setQuery} placeholder="Search expenses..." />
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No expenses match your search.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Docs</TableHead>
              <TableHead>Recurring</TableHead>
              <TableHead>Entity</TableHead>
              {showCreate ? <TableHead className="w-[60px]">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell className="font-medium">
                  <Link href={"/expenses/" + expense.id} className="hover:underline">
                    {expense.title}
                  </Link>
                </TableCell>
                <TableCell>{expense.expenseType?.name ?? expense.category}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {EXPENSE_STATUS_LABELS[expense.status] ?? expense.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {formatMoney(expense.amount, expense.currency)}
                </TableCell>
                <TableCell>{formatDate(expense.dueDate)}</TableCell>
                <TableCell>{expense.attachments.length}</TableCell>
                <TableCell>{expense.isRecurring ? "Yes" : "No"}</TableCell>
                <TableCell>{expense.entity?.name ?? "—"}</TableCell>
                {showCreate ? (
                  <TableCell>
                    <RowActions
                      editHref={"/expenses/" + expense.id + "/edit"}
                      itemId={expense.id}
                      itemLabel={expense.title}
                      deleteAction={deleteExpense}
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
