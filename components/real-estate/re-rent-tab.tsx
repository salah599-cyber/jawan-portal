"use client";

import { useMemo, useState } from "react";
import {
  RE_PDC_STATUS_LABELS,
  RE_RENT_PAYMENT_STATUS_LABELS,
} from "@/lib/labels";
import { formatDate, formatOmr } from "@/lib/format";
import type { SerializedReProperty } from "@/lib/real-estate/serialize";
import { MarkRentPaidForm } from "@/components/real-estate/mark-rent-paid-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type RentRow = SerializedReProperty["units"][number]["rentSchedules"][number] & {
  unitId: string;
  unitNumber: string;
  tenantName: string;
};

function paymentBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "PAID") return "default";
  if (status === "OVERDUE" || status === "PARTIALLY_PAID") return "destructive";
  if (status === "PENDING") return "secondary";
  return "outline";
}

export function ReRentTab({
  property,
  canEdit,
}: {
  property: SerializedReProperty;
  canEdit: boolean;
}) {
  const [markPaidRow, setMarkPaidRow] = useState<RentRow | null>(null);
  const { metrics } = property;

  const scheduleRows = useMemo<RentRow[]>(() => {
    return property.units.flatMap((unit) => {
      const activeLease = unit.leases.find((lease) => lease.status === "ACTIVE");
      const tenantName = activeLease?.tenant.fullName ?? unit.tenants[0]?.fullName ?? "—";
      return unit.rentSchedules.map((row) => ({
        ...row,
        unitId: unit.id,
        unitNumber: unit.unitNumber,
        tenantName,
      }));
    });
  }, [property.units]);

  const sortedSchedule = [...scheduleRows].sort((a, b) => {
    const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
    const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
    return dateA - dateB;
  });

  const pdcRows = scheduleRows.filter((row) => row.pdcChequeNumber);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gross Monthly Rent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatOmr(metrics.grossMonthlyRentOmr)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collected YTD</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatOmr(metrics.rentCollectedYtdOmr)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatOmr(metrics.overdueRentOmr)}</p>
            <p className="text-xs text-muted-foreground">{metrics.overdueRentCount} payment(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending PDC</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {pdcRows.filter((row) => row.pdcStatus === "PENDING").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rent Schedule</CardTitle>
          <CardDescription>{sortedSchedule.length} scheduled payment(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedSchedule.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rent schedule entries.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit ? <TableHead className="w-[100px]" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSchedule.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.unitNumber}</TableCell>
                    <TableCell>{row.tenantName}</TableCell>
                    <TableCell>{row.periodLabel}</TableCell>
                    <TableCell>{formatDate(row.dueDate)}</TableCell>
                    <TableCell className="text-right">{formatOmr(row.amountOmr)}</TableCell>
                    <TableCell>
                      <Badge variant={paymentBadgeVariant(row.paymentStatus)}>
                        {RE_RENT_PAYMENT_STATUS_LABELS[row.paymentStatus] ?? row.paymentStatus}
                      </Badge>
                    </TableCell>
                    {canEdit ? (
                      <TableCell>
                        {row.paymentStatus !== "PAID" && row.paymentStatus !== "WAIVED" ? (
                          <Button variant="outline" size="sm" onClick={() => setMarkPaidRow(row)}>
                            Mark Paid
                          </Button>
                        ) : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pdcRows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>PDC Tracker</CardTitle>
            <CardDescription>Post-dated cheques linked to rent schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead>Cheque #</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>PDC Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pdcRows.map((row) => (
                  <TableRow key={`pdc-${row.id}`}>
                    <TableCell>{row.unitNumber}</TableCell>
                    <TableCell>{row.pdcChequeNumber}</TableCell>
                    <TableCell>{row.pdcBank ?? "—"}</TableCell>
                    <TableCell>{formatDate(row.dueDate)}</TableCell>
                    <TableCell className="text-right">{formatOmr(row.amountOmr)}</TableCell>
                    <TableCell>
                      <Badge variant={row.pdcStatus === "BOUNCED" ? "destructive" : "secondary"}>
                        {row.pdcStatus
                          ? (RE_PDC_STATUS_LABELS[row.pdcStatus] ?? row.pdcStatus)
                          : "—"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={!!markPaidRow} onOpenChange={(open) => !open && setMarkPaidRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Rent Paid</DialogTitle>
            <DialogDescription>
              {markPaidRow
                ? `Unit ${markPaidRow.unitNumber} · ${markPaidRow.periodLabel} · ${formatOmr(markPaidRow.amountOmr)}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {markPaidRow ? (
            <MarkRentPaidForm
              scheduleId={markPaidRow.id}
              defaultAmount={markPaidRow.amountOmr ?? ""}
              onSuccess={() => setMarkPaidRow(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
