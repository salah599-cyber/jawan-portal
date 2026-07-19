import { formatDate } from "@/lib/format";
import type { PublicImportBatchRow } from "@/lib/data/public-markets";
import { PUBLIC_MANAGEMENT_TYPE_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function PublicImportHistoryTable({
  batches,
  showMarket = false,
}: {
  batches: PublicImportBatchRow[];
  showMarket?: boolean;
}) {
  if (batches.length === 0) {
    return <p className="text-sm text-muted-foreground">No imports yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>File</TableHead>
          {showMarket ? <TableHead>Market</TableHead> : null}
          <TableHead>Broker</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Uploaded By</TableHead>
          <TableHead className="text-right">Rows</TableHead>
          <TableHead>As Of</TableHead>
          <TableHead>Imported</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {batches.map((batch) => (
          <TableRow key={batch.id}>
            <TableCell className="font-medium">{batch.fileName}</TableCell>
            {showMarket ? <TableCell>{batch.marketLabel ?? "—"}</TableCell> : null}
            <TableCell>
              <div className="space-y-0.5">
                <p>{batch.broker ?? "—"}</p>
                {batch.accountNumber ? (
                  <p className="text-xs text-muted-foreground">{batch.accountNumber}</p>
                ) : null}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">
                {batch.isManaged
                  ? PUBLIC_MANAGEMENT_TYPE_LABELS.managed
                  : PUBLIC_MANAGEMENT_TYPE_LABELS.reference}
              </Badge>
            </TableCell>
            <TableCell>{batch.uploadedBy}</TableCell>
            <TableCell className="text-right">{batch.rowCount}</TableCell>
            <TableCell>{formatDate(batch.asOfDate)}</TableCell>
            <TableCell>{formatDate(batch.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
