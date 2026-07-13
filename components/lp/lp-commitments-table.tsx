import Link from "next/link";
import { RowActions } from "@/components/platform/row-actions";
import { deleteLpCommitment } from "@/lib/actions/lp-fund";
import { formatDate, formatMoney } from "@/lib/format";
import type { LpCommitmentListRow } from "@/lib/data/lp-fund";
import {
  LP_COMMITMENT_STATUS_LABELS,
  LP_FUND_STRATEGY_LABELS,
} from "@/lib/lp/constants";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatMultiple(value: number | null): string {
  if (value == null) return "—";
  return `${value.toFixed(2)}x`;
}

export function LpCommitmentsTable({
  commitments,
  canEdit,
}: {
  commitments: LpCommitmentListRow[];
  canEdit: boolean;
}) {
  if (commitments.length === 0) {
    return <p className="text-sm text-muted-foreground">No fund commitments yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fund</TableHead>
          <TableHead>GP</TableHead>
          <TableHead>Strategy</TableHead>
          <TableHead>Entity</TableHead>
          <TableHead>Committed</TableHead>
          <TableHead>Paid-In</TableHead>
          <TableHead>NAV</TableHead>
          <TableHead>DPI</TableHead>
          <TableHead>TVPI</TableHead>
          <TableHead>Net IRR</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Updated</TableHead>
          {canEdit ? <TableHead className="w-[60px]">Actions</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {commitments.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">
              <Link href={`/portfolio/fund-lp/${row.id}`} className="hover:underline">
                {row.fundName}
              </Link>
              {row.vintageYear ? (
                <p className="text-xs text-muted-foreground">Vintage {row.vintageYear}</p>
              ) : null}
            </TableCell>
            <TableCell>{row.gpName ?? "—"}</TableCell>
            <TableCell>{LP_FUND_STRATEGY_LABELS[row.strategy] ?? row.strategy}</TableCell>
            <TableCell>{row.entityName}</TableCell>
            <TableCell>{formatMoney(row.commitmentAmount, row.commitmentCurrency)}</TableCell>
            <TableCell>{formatMoney(row.paidInCapital, row.commitmentCurrency)}</TableCell>
            <TableCell>
              {row.latestNav != null
                ? formatMoney(row.latestNav, row.commitmentCurrency)
                : "—"}
            </TableCell>
            <TableCell>{formatMultiple(row.dpi)}</TableCell>
            <TableCell>{formatMultiple(row.tvpi)}</TableCell>
            <TableCell>
              {row.netIrr != null ? `${(row.netIrr * 100).toFixed(1)}%` : "—"}
            </TableCell>
            <TableCell>
              <Badge variant="secondary">
                {LP_COMMITMENT_STATUS_LABELS[row.status] ?? row.status}
              </Badge>
            </TableCell>
            <TableCell>{formatDate(row.updatedAt)}</TableCell>
            {canEdit ? (
              <TableCell>
                <RowActions
                  editHref={`/portfolio/fund-lp/${row.id}/edit`}
                  itemId={row.id}
                  itemLabel={row.fundName}
                  deleteAction={deleteLpCommitment}
                />
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
