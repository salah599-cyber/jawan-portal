"use client";

import Link from "next/link";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { FileActionsWithAccess } from "@/components/platform/file-actions-with-access";
import { deleteAssetExitDocument } from "@/lib/actions/asset-exits";
import { EXIT_SETTLEMENT_STATUS_LABELS, ASSET_EXIT_DOCUMENT_TYPE_LABELS, EXIT_TYPE_LABELS } from "@/lib/labels";
import { formatMoney, formatDate } from "@/lib/format";
import { formatRoiPct, roiTone } from "@/lib/portfolio/exit-metrics";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AssignExitProceedsForm } from "@/components/exits/assign-exit-proceeds-form";

export type AssetExitData = {
  id: string;
  exitType: string;
  exitDate: Date | string;
  proceeds: { toString(): string } | null;
  currency: string;
  counterparty: string | null;
  acquisitionCost: { toString(): string } | null;
  realizedGain: { toString(): string } | null;
  realizedGainPct: { toString(): string } | null;
  settlementStatus?: string;
  settledBankAccount?: { bankName: string; accountName: string } | null;
  notes: string | null;
  landSaleId: string | null;
  documents: {
    id: string;
    documentType: string;
    label: string | null;
    fileName: string;
    fileUrl: string;
    createdAt: Date | string;
  }[];
};

export function AssetExitSummary({
  exit,
  assetId,
  showActions = false,
  canAssignProceeds = false,
}: {
  exit: AssetExitData;
  assetId: string;
  showActions?: boolean;
  canAssignProceeds?: boolean;
}) {
  const fileRefs = exit.documents.map((doc) => ({ kind: "asset-exit" as const, fileId: doc.id }));
  const docsByType = {
    SALE_AGREEMENT: exit.documents.filter((d) => d.documentType === "SALE_AGREEMENT"),
    TRANSFER_DEED: exit.documents.filter((d) => d.documentType === "TRANSFER_DEED"),
    CLOSING_STATEMENT: exit.documents.filter((d) => d.documentType === "CLOSING_STATEMENT"),
    OTHER: exit.documents.filter((d) => d.documentType === "OTHER"),
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Exit Record</CardTitle>
          <CardDescription>
            <Badge variant="outline">{EXIT_TYPE_LABELS[exit.exitType] ?? exit.exitType}</Badge>
            {exit.landSaleId ? " · Linked to land sale" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Detail label="Exit Date" value={formatDate(exit.exitDate)} />
          <Detail label="Proceeds" value={formatMoney(exit.proceeds, exit.currency)} />
          <Detail label="Counterparty" value={exit.counterparty} />
          <Detail label="Acquisition Cost (at exit)" value={formatMoney(exit.acquisitionCost, exit.currency)} />
          <Detail
            label="Realized Gain / Loss"
            value={
              exit.realizedGain != null
                ? formatMoney(exit.realizedGain, exit.currency)
                : null
            }
          />
          <Detail
            label="ROI"
            value={
              <span className={cn("font-medium", roiTone(exit.realizedGainPct))}>
                {formatRoiPct(exit.realizedGainPct)}
              </span>
            }
          />
          <Detail
            label="Proceeds settlement"
            value={
              exit.settlementStatus ? (
                <div className="space-y-1">
                  <Badge variant={exit.settlementStatus === "PENDING" ? "secondary" : "outline"}>
                    {EXIT_SETTLEMENT_STATUS_LABELS[exit.settlementStatus] ?? exit.settlementStatus}
                  </Badge>
                  {exit.settledBankAccount ? (
                    <p className="text-xs text-muted-foreground">
                      {exit.settledBankAccount.bankName} — {exit.settledBankAccount.accountName}
                    </p>
                  ) : null}
                </div>
              ) : null
            }
          />
          {canAssignProceeds && exit.settlementStatus === "PENDING" && exit.proceeds ? (
            <div className="sm:col-span-2">
              <AssignExitProceedsForm
                key={exit.id}
                exitId={exit.id}
                proceeds={exit.proceeds.toString()}
                currency={exit.currency}
              />
            </div>
          ) : null}
          {exit.notes ? (
            <div className="sm:col-span-2">
              <Detail label="Notes" value={exit.notes} />
            </div>
          ) : null}
          <div className="sm:col-span-2 flex flex-wrap gap-4">
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href={"/assets/" + assetId}>View asset record</Link>
            </Button>
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href="/portfolio/exits">View all exits</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {(["SALE_AGREEMENT", "TRANSFER_DEED", "CLOSING_STATEMENT", "OTHER"] as const).map((type) => {
        const docs = docsByType[type];
        if (docs.length === 0) return null;
        return (
          <Card key={type}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{ASSET_EXIT_DOCUMENT_TYPE_LABELS[type]}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {docs.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{doc.label ?? doc.fileName}</p>
                      <p className="text-muted-foreground">{formatDate(doc.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <FileActionsWithAccess
                        kind="asset-exit"
                        fileId={doc.id}
                        fileName={doc.label ?? doc.fileName}
                        files={fileRefs}
                        compact
                      />
                      {showActions ? (
                        <DeleteEntryButton
                          itemId={doc.id}
                          itemLabel={doc.label ?? doc.fileName}
                          deleteAction={deleteAssetExitDocument}
                          title="Delete document?"
                        />
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode | string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{value ?? "—"}</div>
    </div>
  );
}
