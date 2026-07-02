"use client";

import { useState } from "react";
import Link from "next/link";
import {
  RE_OCCUPANCY_STATUS_LABELS,
  RE_UNIT_TYPE_LABELS,
} from "@/lib/labels";
import { formatDate, formatOmr } from "@/lib/format";
import type { SerializedReProperty } from "@/lib/real-estate/serialize";
import { CreateUnitForm } from "@/components/real-estate/create-unit-form";
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

function occupancyVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (status === "RENTED") return "default";
  if (status === "VACANT") return "secondary";
  if (status === "UNDER_RENOVATION") return "outline";
  return "outline";
}

export function ReUnitsTab({
  property,
  canEdit,
}: {
  property: SerializedReProperty;
  canEdit: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-4">
      {canEdit ? (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add Unit</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Unit</DialogTitle>
              <DialogDescription>Register a new unit for {property.name}</DialogDescription>
            </DialogHeader>
            <CreateUnitForm
              propertyId={property.id}
              onSuccess={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      ) : null}

      {property.units.length === 0 ? (
        <p className="text-sm text-muted-foreground">No units registered yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {property.units.map((unit) => {
            const activeLease = unit.leases.find((lease) => lease.status === "ACTIVE");
            const tenant = activeLease?.tenant ?? unit.tenants[0];

            return (
              <Card key={unit.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">
                      <Link href={`/real-estate/${property.id}/units/${unit.id}`} className="hover:underline">
                        Unit {unit.unitNumber}
                      </Link>
                    </CardTitle>
                    <Badge variant={occupancyVariant(unit.occupancyStatus)}>
                      {RE_OCCUPANCY_STATUS_LABELS[unit.occupancyStatus] ?? unit.occupancyStatus}
                    </Badge>
                  </div>
                  <CardDescription>
                    {RE_UNIT_TYPE_LABELS[unit.unitType] ?? unit.unitType}
                    {unit.floorNumber != null ? ` · Floor ${unit.floorNumber}` : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {tenant ? (
                    <div>
                      <p className="text-xs text-muted-foreground">Tenant</p>
                      <p className="font-medium">{tenant.fullName}</p>
                    </div>
                  ) : unit.occupancyStatus === "VACANT" && unit.vacantSince ? (
                    <div>
                      <p className="text-xs text-muted-foreground">Vacant since</p>
                      <p>{formatDate(unit.vacantSince)}</p>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Market Rent</p>
                      <p>{unit.marketRentOmr ? formatOmr(unit.marketRentOmr) : "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Lease Rent</p>
                      <p>
                        {activeLease?.rentAmountOmr ? formatOmr(activeLease.rentAmountOmr) : "—"}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link href={`/real-estate/${property.id}/units/${unit.id}`}>View Unit</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
