"use client";

import { useState } from "react";
import { RowActions } from "@/components/platform/row-actions";
import { LandDetailSheet } from "@/components/lands/land-detail-sheet";
import { deleteLand } from "@/lib/actions/lands";
import { ASSET_STATUS_LABELS } from "@/lib/labels";
import { formatMoney, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LandRow = {
  id: string;
  name: string;
  wilayat: string;
  governorate: string;
  krookiNumber: string | null;
  mulkiaNumber: string | null;
  status: string;
  currentValue: { toString(): string } | null;
  currency: string;
  updatedAt: Date | string;
  entity: { name: string };
  documents: { id: string }[];
  sale: { id: string } | null;
};

export function LandsTable({
  lands,
  showActions,
}: {
  lands: LandRow[];
  showActions: boolean;
}) {
  const [selectedLandId, setSelectedLandId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  function openLand(id: string) {
    setSelectedLandId(id);
    setSheetOpen(true);
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Krooki / Mulkia</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead>Docs</TableHead>
            <TableHead>Updated</TableHead>
            {showActions ? <TableHead className="w-[60px]">Actions</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {lands.map((land) => (
            <TableRow
              key={land.id}
              className="cursor-pointer"
              onClick={() => openLand(land.id)}
            >
              <TableCell className="font-medium">{land.name}</TableCell>
              <TableCell>
                {land.wilayat}, {land.governorate}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {[land.krookiNumber, land.mulkiaNumber].filter(Boolean).join(" / ") || "—"}
              </TableCell>
              <TableCell>{land.entity.name}</TableCell>
              <TableCell>
                <Badge variant={land.sale || land.status === "EXITED" ? "outline" : "secondary"}>
                  {land.sale || land.status === "EXITED"
                    ? "Sold"
                    : ASSET_STATUS_LABELS[land.status] ?? land.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{formatMoney(land.currentValue, land.currency)}</TableCell>
              <TableCell>{land.documents.length}</TableCell>
              <TableCell>{formatDate(land.updatedAt)}</TableCell>
              {showActions ? (
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <RowActions
                    editHref={"/lands/" + land.id + "/edit"}
                    itemId={land.id}
                    itemLabel={land.name}
                    deleteAction={deleteLand}
                  />
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <LandDetailSheet
        landId={selectedLandId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        showActions={showActions}
      />
    </>
  );
}
