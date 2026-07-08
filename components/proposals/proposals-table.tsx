"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { usePagination } from "@/hooks/use-pagination";
import { TableSearchInput } from "@/components/platform/table-search-input";
import { TablePagination } from "@/components/platform/table-pagination";
import { ProposalStatusBadge } from "@/components/proposals/proposal-status-badge";
import { type listProposals } from "@/lib/actions/proposals";
import { formatApproverProgress } from "@/lib/proposals/approval";
import { formatUserName } from "@/lib/proposals/users";
import { formatMoney, formatDate } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Proposal = Awaited<ReturnType<typeof listProposals>>[number];

export function ProposalsTable({ proposals }: { proposals: Proposal[] }) {
  const getSearchText = useCallback(
    (proposal: Proposal) =>
      [proposal.name, proposal.entity?.name, proposal.status, formatUserName(proposal.submittedBy)]
        .filter(Boolean)
        .join(" "),
    [],
  );
  const { query, setQuery, filtered } = useSearchFilter(proposals, getSearchText);
  const { page, setPage, pageCount, paged, total, pageSize } = usePagination(filtered, { resetKey: query });

  if (proposals.length === 0) {
    return <p className="text-sm text-muted-foreground">No proposals found.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <TableSearchInput value={query} onChange={setQuery} placeholder="Search proposals..." />
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No proposals match your search.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted By</TableHead>
              <TableHead>Approvals</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((proposal) => (
              <TableRow key={proposal.id}>
                <TableCell className="font-medium">
                  <Link href={"/proposals/" + proposal.id} className="hover:underline">
                    {proposal.name}
                  </Link>
                </TableCell>
                <TableCell>{formatMoney(proposal.suggestedAmount, proposal.currency)}</TableCell>
                <TableCell>{proposal.entity?.name ?? "—"}</TableCell>
                <TableCell>
                  <ProposalStatusBadge status={proposal.status} />
                </TableCell>
                <TableCell>{formatUserName(proposal.submittedBy)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {proposal.status === "PENDING" || proposal.status === "APPROVED" || proposal.status === "REJECTED"
                    ? formatApproverProgress(proposal.approvers)
                    : "—"}
                </TableCell>
                <TableCell>{formatDate(proposal.updatedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <TablePagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPageChange={setPage} />
    </div>
  );
}
