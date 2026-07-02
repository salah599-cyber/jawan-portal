"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import type { ReRentDashboard } from "@/lib/data/real-estate";
import { RE_RENT_PAYMENT_STATUS_LABELS } from "@/lib/labels";
import { formatDate, formatOmr } from "@/lib/format";
import { MarkRentPaidForm } from "@/components/real-estate/mark-rent-paid-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function whatsAppReminderUrl(row: ReRentDashboard["rows"][number]): string {
  const message = [
    "Rent reminder",
    `${row.propertyName} · Unit ${row.unitNumber}`,
    `Tenant: ${row.tenantName}`,
    `Due: ${formatDate(row.dueDate)}`,
    `Amount: ${formatOmr(row.outstandingOmr > 0 ? row.outstandingOmr : row.amountOmr)}`,
  ].join("\n");
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

function paymentBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "PAID") return "default";
  if (status === "OVERDUE" || status === "PARTIALLY_PAID") return "destructive";
  return "secondary";
}

export function RentDashboardClient({
  dashboard,
  canEdit,
  entities = [],
  entityId,
}: {
  dashboard: ReRentDashboard;
  canEdit: boolean;
  entities?: { id: string; name: string }[];
  entityId?: string;
}) {
  const [markPaidId, setMarkPaidId] = useState<ReRentDashboard["rows"][number] | null>(null);
  const { summary, rows } = dashboard;

  const overdueRows = useMemo(
    () => rows.filter((row) => row.paymentStatus === "OVERDUE" || row.paymentStatus === "PARTIALLY_PAID"),
    [rows],
  );

  return (
    <div className="space-y-6">
      {entities.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {entities.map((entity) => (
            <Button
              key={entity.id}
              variant={entity.id === entityId ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link href={`/real-estate/rent?entity=${entity.id}`}>{entity.name}</Link>
            </Button>
          ))}
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gross Monthly Rent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatOmr(summary.grossMonthlyRentOmr)}</p>
            <p className="text-xs text-muted-foreground">
              {summary.occupiedUnits}/{summary.totalUnits} units occupied
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Due This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatOmr(summary.dueThisMonthOmr)}</p>
            <p className="text-xs text-muted-foreground">{summary.dueThisMonthCount} payment(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatOmr(summary.overdueRentOmr)}</p>
            <p className="text-xs text-muted-foreground">{summary.overdueCount} payment(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collected YTD</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatOmr(summary.collectedYtdOmr)}</p>
            <p className="text-xs text-muted-foreground">{summary.pendingPdcCount} pending PDC</p>
          </CardContent>
        </Card>
      </div>

      {overdueRows.length > 0 ? (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">Overdue Rent</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="w-[180px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueRows.map((row) => (
                  <TableRow key={`overdue-${row.id}`}>
                    <TableCell>
                      <Link href={`/real-estate/${row.propertyId}?tab=rent`} className="hover:underline">
                        {row.propertyName}
                      </Link>
                    </TableCell>
                    <TableCell>{row.unitNumber}</TableCell>
                    <TableCell>{row.tenantName}</TableCell>
                    <TableCell>{formatDate(row.dueDate)}</TableCell>
                    <TableCell className="text-right">{formatOmr(row.outstandingOmr)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" asChild>
                          <a href={whatsAppReminderUrl(row)} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="mr-1 size-4" />
                            WhatsApp
                          </a>
                        </Button>
                        {canEdit ? (
                          <Button variant="outline" size="sm" onClick={() => setMarkPaidId(row)}>
                            Mark Paid
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Rent Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rent schedule entries.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
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
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link href={`/real-estate/${row.propertyId}?tab=rent`} className="hover:underline">
                        {row.propertyName}
                      </Link>
                    </TableCell>
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
                          <Button variant="outline" size="sm" onClick={() => setMarkPaidId(row)}>
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

      <Dialog open={!!markPaidId} onOpenChange={(open) => !open && setMarkPaidId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Rent Paid</DialogTitle>
            <DialogDescription>
              {markPaidId
                ? `${markPaidId.propertyName} · Unit ${markPaidId.unitNumber} · ${formatOmr(markPaidId.amountOmr)}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {markPaidId ? (
            <MarkRentPaidForm
              scheduleId={markPaidId.id}
              defaultAmount={String(markPaidId.outstandingOmr > 0 ? markPaidId.outstandingOmr : markPaidId.amountOmr)}
              onSuccess={() => setMarkPaidId(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
