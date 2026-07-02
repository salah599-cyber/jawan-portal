import { formatDate } from "@/lib/format";
import type { MsxImportBatchRow } from "@/lib/data/msx-portfolio";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function MsxImportHistoryTable({ batches }: { batches: MsxImportBatchRow[] }) {
  if (batches.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Import history will appear after your first upload.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>File</TableHead>
          <TableHead>Uploaded By</TableHead>
          <TableHead className="text-right">Holdings</TableHead>
          <TableHead>Imported</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {batches.map((batch) => (
          <TableRow key={batch.id}>
            <TableCell className="font-medium">{batch.fileName}</TableCell>
            <TableCell>{batch.uploadedBy}</TableCell>
            <TableCell className="text-right">{batch.rowCount}</TableCell>
            <TableCell>{formatDate(batch.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
