"use client";

import { useMemo, useState } from "react";
import {
  RE_LEASE_STATUS_LABELS,
  RE_PAYMENT_FREQUENCY_LABELS,
  RE_PAYMENT_METHOD_LABELS,
} from "@/lib/labels";
import { formatDate, formatOmr } from "@/lib/format";
import type { SerializedReProperty } from "@/lib/real-estate/serialize";
import { renewLease } from "@/lib/actions/real-estate";
import { CreateLeaseForm } from "@/components/real-estate/create-lease-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";

type LeaseRow = SerializedReProperty["units"][number]["leases"][number] & {
  unitId: string;
  unitNumber: string;
};

export function ReLeasesTab({
  property,
  canEdit,
}: {
  property: SerializedReProperty;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [renewLeaseId, setRenewLeaseId] = useState<LeaseRow | null>(null);

  const allLeases = useMemo<LeaseRow[]>(() => {
    return property.units.flatMap((unit) =>
      unit.leases.map((lease) => ({
        ...lease,
        unitId: unit.id,
        unitNumber: unit.unitNumber,
      })),
    );
  }, [property.units]);

  const activeLeases = allLeases.filter((lease) => lease.status === "ACTIVE");

  function handleRenew(lease: LeaseRow) {
    setRenewLeaseId(lease);
  }

  return (
    <div className="space-y-4">
      {canEdit ? (
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>Add Lease</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Lease</DialogTitle>
              <DialogDescription>Create a new lease for {property.name}</DialogDescription>
            </DialogHeader>
            <CreateLeaseForm
              units={property.units.map((unit) => ({
                id: unit.id,
                unitNumber: unit.unitNumber,
                tenants: unit.tenants,
              }))}
              onSuccess={() => setAddOpen(false)}
            />
          </DialogContent>
        </Dialog>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Active Leases</CardTitle>
          <CardDescription>{activeLeases.length} active lease(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {activeLeases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active leases.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead className="text-right">Rent</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Method</TableHead>
                  {canEdit ? <TableHead className="w-[100px]" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeLeases.map((lease) => (
                  <TableRow key={lease.id}>
                    <TableCell>{lease.unitNumber}</TableCell>
                    <TableCell>{lease.tenant.fullName}</TableCell>
                    <TableCell>{formatDate(lease.leaseStartDate)}</TableCell>
                    <TableCell>{formatDate(lease.leaseEndDate)}</TableCell>
                    <TableCell className="text-right">{formatOmr(lease.rentAmountOmr)}</TableCell>
                    <TableCell>
                      {RE_PAYMENT_FREQUENCY_LABELS[lease.paymentFrequency] ?? lease.paymentFrequency}
                    </TableCell>
                    <TableCell>
                      {RE_PAYMENT_METHOD_LABELS[lease.paymentMethod] ?? lease.paymentMethod}
                    </TableCell>
                    {canEdit ? (
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleRenew(lease)}>
                          Renew
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {allLeases.length > activeLeases.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Lease History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allLeases
                  .filter((lease) => lease.status !== "ACTIVE")
                  .map((lease) => (
                    <TableRow key={lease.id}>
                      <TableCell>{lease.unitNumber}</TableCell>
                      <TableCell>{lease.tenant.fullName}</TableCell>
                      <TableCell>
                        {formatDate(lease.leaseStartDate)} – {formatDate(lease.leaseEndDate)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {RE_LEASE_STATUS_LABELS[lease.status] ?? lease.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={!!renewLeaseId} onOpenChange={(open) => !open && setRenewLeaseId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Renew Lease</DialogTitle>
            <DialogDescription>
              {renewLeaseId
                ? `Unit ${renewLeaseId.unitNumber} · ${renewLeaseId.tenant.fullName}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {renewLeaseId ? (
            <CreateLeaseForm
              units={property.units.map((unit) => ({
                id: unit.id,
                unitNumber: unit.unitNumber,
                tenants: unit.tenants,
              }))}
              defaultUnitId={renewLeaseId.unitId}
              defaultTenantId={renewLeaseId.tenant.id}
              submitLabel="Renew Lease"
              onSubmit={async (formData) => {
                await renewLease(renewLeaseId.id, formData);
              }}
              onSuccess={() => {
                setRenewLeaseId(null);
                router.refresh();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
