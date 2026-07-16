"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { usePagination } from "@/hooks/use-pagination";
import { TableSearchInput } from "@/components/platform/table-search-input";
import { TablePagination } from "@/components/platform/table-pagination";
import { RowActions } from "@/components/platform/row-actions";
import { deleteDirectoryContact } from "@/lib/actions/contacts";
import { DIRECTORY_CONTACT_TYPE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import type { DirectoryContactListRow } from "@/lib/actions/contacts";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function ContactsTable({
  contacts,
  canEdit,
}: {
  contacts: DirectoryContactListRow[];
  canEdit: boolean;
}) {
  const getSearchText = useCallback((contact: DirectoryContactListRow) => contact.fullName, []);
  const { query, setQuery, filtered } = useSearchFilter(contacts, getSearchText);
  const { page, setPage, pageCount, paged, total, pageSize } = usePagination(filtered, { resetKey: query });

  if (contacts.length === 0) {
    return <p className="text-sm text-muted-foreground">No contacts registered yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <TableSearchInput value={query} onChange={setQuery} placeholder="Search by name..." />
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No contacts match your search.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Follow-up</TableHead>
              <TableHead>Status</TableHead>
              {canEdit ? <TableHead className="w-[60px]">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell className="font-medium">
                  <Link href={`/contacts/${contact.id}`} className="hover:underline">
                    {contact.fullName}
                  </Link>
                  {contact.jobTitle ? (
                    <p className="text-xs text-muted-foreground">{contact.jobTitle}</p>
                  ) : contact.email ? (
                    <p className="text-xs text-muted-foreground">{contact.email}</p>
                  ) : null}
                </TableCell>
                <TableCell>
                  {DIRECTORY_CONTACT_TYPE_LABELS[contact.contactType] ?? contact.contactType}
                </TableCell>
                <TableCell>{contact.organization ?? "—"}</TableCell>
                <TableCell>{contact.entityName ?? "Global"}</TableCell>
                <TableCell>{contact.phonePrimary ?? "—"}</TableCell>
                <TableCell>
                  {contact.nextFollowUpDate ? (
                    <span
                      className={
                        contact.followUpOverdue
                          ? "text-destructive font-medium"
                          : contact.followUpDue
                            ? "text-amber-600 dark:text-amber-400"
                            : undefined
                      }
                    >
                      {formatDate(contact.nextFollowUpDate)}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={contact.isActive ? "default" : "secondary"}>
                    {contact.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                {canEdit ? (
                  <TableCell>
                    <RowActions
                      editHref={`/contacts/${contact.id}/edit`}
                      itemId={contact.id}
                      itemLabel={contact.fullName}
                      deleteAction={deleteDirectoryContact}
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
