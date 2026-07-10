import Link from "next/link";
import type { UnifiedExitRecord } from "@/lib/portfolio/exit-analytics";
import { EXIT_SETTLEMENT_STATUS_LABELS } from "@/lib/labels";
import { formatDate, formatMoney } from "@/lib/format";
import { formatRoiPct, roiTone } from "@/lib/portfolio/exit-metrics";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AssignExitProceedsForm } from "@/components/exits/assign-exit-proceeds-form";

const SOURCE_LABELS: Record<UnifiedExitRecord["source"], string> = {
  ASSET: "Asset",
  PRIVATE_EQUITY: "Private Equity",
  REAL_ESTATE: "Real Estate",
};

export function ExitsTable({
  exits,
  canAssignProceeds,
}: {
  exits: UnifiedExitRecord[];
  canAssignProceeds: boolean;
}) {
  if (exits.length === 0) {
    return <p className="text-sm text-muted-foreground">No exits recorded yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Entity</TableHead>
          <TableHead>Exit Type</TableHead>
          <TableHead>Exit Date</TableHead>
          <TableHead className="text-right">Proceeds</TableHead>
          <TableHead className="text-right">ROI</TableHead>
          <TableHead>Settlement</TableHead>
          <TableHead className="w-[60px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {exits.map((exit) => (
          <TableRow key={`${exit.source}-${exit.id}`}>
            <TableCell className="font-medium">{exit.name}</TableCell>
            <TableCell>{SOURCE_LABELS[exit.source]}</TableCell>
            <TableCell>{exit.category}</TableCell>
            <TableCell>{exit.entityName}</TableCell>
            <TableCell>{exit.exitType}</TableCell>
            <TableCell>{formatDate(exit.exitDate)}</TableCell>
            <TableCell className="text-right">
              {formatMoney(exit.proceedsNative, exit.currency)}
            </TableCell>
            <TableCell className={cn("text-right font-medium", roiTone(exit.roiPct))}>
              {formatRoiPct(exit.roiPct)}
            </TableCell>
            <TableCell>
              {exit.settlementStatus ? (
                <div className="space-y-1">
                  <Badge
                    variant={exit.settlementStatus === "PENDING" ? "secondary" : "outline"}
                  >
                    {EXIT_SETTLEMENT_STATUS_LABELS[exit.settlementStatus] ?? exit.settlementStatus}
                  </Badge>
                  {exit.settledBankLabel ? (
                    <p className="text-xs text-muted-foreground">{exit.settledBankLabel}</p>
                  ) : null}
                  {canAssignProceeds &&
                  exit.settlementStatus === "PENDING" &&
                  exit.assetExitId &&
                  exit.proceedsNative != null ? (
                    <div className="pt-2">
                      <AssignExitProceedsForm
                        key={exit.assetExitId}
                        exitId={exit.assetExitId}
                        proceeds={String(exit.proceedsNative)}
                        currency={exit.currency}
                        compact
                      />
                    </div>
                  ) : null}
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell>
              <Button variant="outline" size="sm" asChild>
                <Link href={exit.href}>View</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
