import Link from "next/link";
import {
  RE_LEASE_STATUS_LABELS,
  RE_OCCUPANCY_STATUS_LABELS,
  RE_RENT_PAYMENT_STATUS_LABELS,
  RE_UNIT_TYPE_LABELS,
} from "@/lib/labels";
import { formatDate, formatOmr } from "@/lib/format";
import { PeDetailField } from "@/components/pe/pe-detail-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type SerializedReUnitDetail = {
  id: string;
  unitNumber: string;
  unitType: string;
  floorNumber: number | null;
  areaSqm: string | null;
  numBedrooms: number | null;
  numBathrooms: number | null;
  numParkingSpaces: number | null;
  occupancyStatus: string;
  furnishingStatus: string | null;
  marketRentOmr: string | null;
  vacantSince: string | null;
  electricityMeterNumber: string | null;
  electricityAccountNumber: string | null;
  waterMeterNumber: string | null;
  waterAccountNumber: string | null;
  notes: string | null;
  property: {
    id: string;
    name: string;
    entity: { id: string; name: string };
  };
  tenant: {
    id: string;
    fullName: string;
    phonePrimary: string | null;
    phoneSecondary: string | null;
    email: string | null;
    nationality: string | null;
    idNumber: string | null;
  } | null;
  metrics: {
    outstandingRentOmr: number;
    rentCollectedYtdOmr: number;
    maintenanceCostYtdOmr: number;
  };
  leases: Array<{
    id: string;
    status: string;
    leaseStartDate: string | Date;
    leaseEndDate: string | Date;
    rentAmountOmr: string | null;
    paymentFrequency: string;
    tenant: { fullName: string };
  }>;
  rentSchedules: Array<{
    id: string;
    dueDate: string | Date;
    periodLabel: string;
    amountOmr: string | null;
    paymentStatus: string;
    paidAmountOmr: string | null;
  }>;
  maintenance: Array<{
    id: string;
    reportedDate: string | Date;
    category: string;
    description: string;
    status: string;
  }>;
  utilityReadings: Array<{
    id: string;
    utilityType: string;
    readingDate: string | Date;
    meterReading: string | null;
    amountOmr: string | null;
  }>;
};

export function UnitDetailView({ unit }: { unit: SerializedReUnitDetail }) {
  const activeLease = unit.leases.find((lease) => lease.status === "ACTIVE");
  const upcomingRent = unit.rentSchedules
    .filter((row) => row.paymentStatus !== "PAID")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href={`/real-estate/${unit.property.id}`} className="hover:underline">
              {unit.property.name}
            </Link>
            {" · "}
            {unit.property.entity.name}
          </p>
          <h1 className="text-2xl font-semibold">Unit {unit.unitNumber}</h1>
        </div>
        <Badge variant={unit.occupancyStatus === "RENTED" ? "default" : "secondary"}>
          {RE_OCCUPANCY_STATUS_LABELS[unit.occupancyStatus] ?? unit.occupancyStatus}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Market Rent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {unit.marketRentOmr ? formatOmr(unit.marketRentOmr) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lease Rent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {activeLease?.rentAmountOmr ? formatOmr(activeLease.rentAmountOmr) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Next Due</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {upcomingRent ? formatOmr(upcomingRent.amountOmr) : "—"}
            </p>
            {upcomingRent ? (
              <p className="text-xs text-muted-foreground">{formatDate(upcomingRent.dueDate)}</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatOmr(unit.metrics.outstandingRentOmr)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unit Details</CardTitle>
          <CardDescription>{RE_UNIT_TYPE_LABELS[unit.unitType] ?? unit.unitType}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PeDetailField label="Floor" value={unit.floorNumber?.toString()} />
          <PeDetailField label="Area (m²)" value={unit.areaSqm} />
          <PeDetailField label="Bedrooms" value={unit.numBedrooms?.toString()} />
          <PeDetailField label="Bathrooms" value={unit.numBathrooms?.toString()} />
          <PeDetailField label="Parking" value={unit.numParkingSpaces?.toString()} />
          <PeDetailField label="Electricity Meter" value={unit.electricityMeterNumber} />
          <PeDetailField label="Water Meter" value={unit.waterMeterNumber} />
          {unit.vacantSince ? (
            <PeDetailField label="Vacant Since" value={formatDate(unit.vacantSince)} />
          ) : null}
        </CardContent>
      </Card>

      {unit.tenant ? (
        <Card>
          <CardHeader>
            <CardTitle>Tenant</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <PeDetailField label="Name" value={unit.tenant.fullName} />
            <PeDetailField label="Nationality" value={unit.tenant.nationality} />
            <PeDetailField label="Phone" value={unit.tenant.phonePrimary ?? unit.tenant.phoneSecondary} />
            <PeDetailField label="Email" value={unit.tenant.email} />
            <PeDetailField label="ID Number" value={unit.tenant.idNumber} />
          </CardContent>
        </Card>
      ) : null}

      {activeLease ? (
        <Card>
          <CardHeader>
            <CardTitle>Active Lease</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <PeDetailField label="Tenant" value={activeLease.tenant.fullName} />
            <PeDetailField label="Start" value={formatDate(activeLease.leaseStartDate)} />
            <PeDetailField label="End" value={formatDate(activeLease.leaseEndDate)} />
            <PeDetailField label="Rent" value={formatOmr(activeLease.rentAmountOmr)} />
          </CardContent>
        </Card>
      ) : null}

      {unit.leases.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Lease History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead className="text-right">Rent</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unit.leases.map((lease) => (
                  <TableRow key={lease.id}>
                    <TableCell>
                      {formatDate(lease.leaseStartDate)} – {formatDate(lease.leaseEndDate)}
                    </TableCell>
                    <TableCell>{lease.tenant.fullName}</TableCell>
                    <TableCell className="text-right">{formatOmr(lease.rentAmountOmr)}</TableCell>
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

      {unit.rentSchedules.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Rent Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unit.rentSchedules.slice(0, 12).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.periodLabel}</TableCell>
                    <TableCell>{formatDate(row.dueDate)}</TableCell>
                    <TableCell className="text-right">{formatOmr(row.amountOmr)}</TableCell>
                    <TableCell>
                      <Badge variant={row.paymentStatus === "OVERDUE" ? "destructive" : "secondary"}>
                        {RE_RENT_PAYMENT_STATUS_LABELS[row.paymentStatus] ?? row.paymentStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href={`/real-estate/${unit.property.id}?tab=units`}>Back to Property</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/real-estate/${unit.property.id}?tab=rent`}>Rent Tab</Link>
        </Button>
      </div>
    </div>
  );
}
