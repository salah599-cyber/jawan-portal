"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { usePagination } from "@/hooks/use-pagination";
import { TableSearchInput } from "@/components/platform/table-search-input";
import { TablePagination } from "@/components/platform/table-pagination";
import { RowActions } from "@/components/platform/row-actions";
import { deleteCompany, type listCompanies } from "@/lib/actions/companies";
import { ASSET_STATUS_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Company = Awaited<ReturnType<typeof listCompanies>>[number];

export function CompaniesTable({ companies, showAdd }: { companies: Company[]; showAdd: boolean }) {
  const getSearchText = useCallback(
    (company: Company) =>
      [company.name, company.registrationNumber, company.entity.name, company.ceoName, company.status]
        .filter(Boolean)
        .join(" "),
    [],
  );
  const { query, setQuery, filtered } = useSearchFilter(companies, getSearchText);
  const { page, setPage, pageCount, paged, total, pageSize } = usePagination(filtered, { resetKey: query });

  if (companies.length === 0) {
    return <p className="text-sm text-muted-foreground">No companies registered yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <TableSearchInput value={query} onChange={setQuery} placeholder="Search companies..." />
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No companies match your search.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Registration No.</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Owners</TableHead>
              <TableHead>CEO</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Docs</TableHead>
              <TableHead>Updated</TableHead>
              {showAdd ? <TableHead className="w-[60px]">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((company) => (
              <TableRow key={company.id}>
                <TableCell className="font-medium">
                  <Link href={"/companies/" + company.id} className="hover:underline">
                    {company.name}
                  </Link>
                </TableCell>
                <TableCell>{company.registrationNumber}</TableCell>
                <TableCell>{company.entity.name}</TableCell>
                <TableCell>{company.owners.length}</TableCell>
                <TableCell>{company.ceoName ?? "-"}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{ASSET_STATUS_LABELS[company.status] ?? company.status}</Badge>
                </TableCell>
                <TableCell>{formatDate(company.registrationExpiryDate)}</TableCell>
                <TableCell>{company.documents.length}</TableCell>
                <TableCell>{formatDate(company.updatedAt)}</TableCell>
                {showAdd ? (
                  <TableCell>
                    <RowActions
                      editHref={"/companies/" + company.id + "/edit"}
                      itemId={company.id}
                      itemLabel={company.name}
                      deleteAction={deleteCompany}
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
