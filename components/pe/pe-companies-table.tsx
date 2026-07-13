import Link from "next/link";
import { RowActions } from "@/components/platform/row-actions";
import { deletePeCompany } from "@/lib/actions/pe-portfolio";
import { PE_STAGE_LABELS, PE_STATUS_LABELS } from "@/lib/labels";
import { formatDate, formatMoney } from "@/lib/format";
import type { PeCompanyListRow } from "@/lib/data/pe-portfolio";
import { formatIrr, formatMultiple } from "@/lib/pe/metrics";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function PeCompaniesTable({
  companies,
  canEdit,
}: {
  companies: PeCompanyListRow[];
  canEdit: boolean;
}) {
  if (companies.length === 0) {
    return <p className="text-sm text-muted-foreground">No portfolio companies yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Company</TableHead>
          <TableHead>Stage</TableHead>
          <TableHead>Sector</TableHead>
          <TableHead>Entity</TableHead>
          <TableHead>Invested</TableHead>
          <TableHead>Fair Value</TableHead>
          <TableHead>MOIC</TableHead>
          <TableHead>Net IRR</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Updated</TableHead>
          {canEdit ? <TableHead className="w-[60px]">Actions</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {companies.map((company) => (
          <TableRow key={company.id}>
            <TableCell className="font-medium">
              <Link href={`/portfolio/pe/${company.id}`} className="hover:underline">
                {company.name}
              </Link>
              {company.tradingName ? (
                <p className="text-xs text-muted-foreground">{company.tradingName}</p>
              ) : null}
            </TableCell>
            <TableCell>{PE_STAGE_LABELS[company.stage] ?? company.stage}</TableCell>
            <TableCell>{company.sector ?? "—"}</TableCell>
            <TableCell>{company.entityName}</TableCell>
            <TableCell>{formatMoney(company.totalInvested, company.reportingCurrency)}</TableCell>
            <TableCell>
              {company.latestFairValue != null
                ? formatMoney(company.latestFairValue, company.reportingCurrency)
                : "—"}
            </TableCell>
            <TableCell>{formatMultiple(company.moic) ?? "—"}</TableCell>
            <TableCell>{formatIrr(company.netIrr) ?? "—"}</TableCell>
            <TableCell>
              <Badge variant="secondary">{PE_STATUS_LABELS[company.status] ?? company.status}</Badge>
            </TableCell>
            <TableCell>{formatDate(company.updatedAt)}</TableCell>
            {canEdit ? (
              <TableCell>
                <RowActions
                  editHref={`/portfolio/pe/${company.id}/edit`}
                  itemId={company.id}
                  itemLabel={company.name}
                  deleteAction={deletePeCompany}
                />
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
