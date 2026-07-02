import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { UnitDetailView } from "@/components/real-estate/unit-detail-view";
import { getUnitDetail } from "@/lib/data/real-estate";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Button } from "@/components/ui/button";

export default async function UnitDetailPage({
  params,
}: {
  params: Promise<{ id: string; unitId: string }>;
}) {
  const { id, unitId } = await params;
  const ctx = await requireModuleAccess("REAL_ESTATE");

  const unit = await getUnitDetail(unitId, ctx);
  if (!unit || unit.property.id !== id) notFound();

  const canEdit = canWrite(ctx, "REAL_ESTATE");

  return (
    <>
      <PlatformHeader title={`${unit.property.name} — ${unit.unitNumber}`} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              Unit {unit.unitNumber} · {unit.property.name}
            </h2>
            <p className="text-sm text-muted-foreground">{unit.property.entity.name}</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/real-estate/${id}?tab=units`}>Back to property</Link>
          </Button>
        </div>
        <UnitDetailView
          unit={{
            id: unit.id,
            unitNumber: unit.unitNumber,
            unitType: unit.unitType,
            floorNumber: unit.floorNumber,
            areaSqm: unit.areaSqm?.toString() ?? null,
            numBedrooms: unit.numBedrooms,
            numBathrooms: unit.numBathrooms,
            numParkingSpaces: unit.numParkingSpaces,
            occupancyStatus: unit.occupancyStatus,
            furnishingStatus: unit.furnishingStatus,
            marketRentOmr: unit.marketRentOmr?.toString() ?? null,
            vacantSince: unit.vacantSince?.toISOString() ?? null,
            electricityMeterNumber: unit.electricityMeterNumber,
            electricityAccountNumber: unit.electricityAccountNumber,
            waterMeterNumber: unit.waterMeterNumber,
            waterAccountNumber: unit.waterAccountNumber,
            notes: unit.notes,
            property: unit.property,
            tenant: unit.tenant,
            metrics: {
              outstandingRentOmr: unit.metrics.outstandingRentOmr,
              rentCollectedYtdOmr: unit.metrics.rentCollectedYtdOmr,
              maintenanceCostYtdOmr: unit.metrics.maintenanceCostYtdOmr,
            },
            leases: unit.leases.map((lease) => ({
              id: lease.id,
              status: lease.status,
              leaseStartDate: lease.leaseStartDate,
              leaseEndDate: lease.leaseEndDate,
              rentAmountOmr: lease.rentAmountOmr?.toString() ?? null,
              paymentFrequency: lease.paymentFrequency,
              tenant: { fullName: lease.tenant.fullName },
            })),
            rentSchedules: unit.rentSchedules.map((row) => ({
              id: row.id,
              dueDate: row.dueDate,
              periodLabel: row.periodLabel,
              amountOmr: row.amountOmr?.toString() ?? null,
              paymentStatus: row.paymentStatus,
              paidAmountOmr: row.paidAmountOmr?.toString() ?? null,
            })),
            maintenance: unit.maintenance.map((m) => ({
              id: m.id,
              reportedDate: m.reportedDate,
              category: m.category,
              description: m.description,
              status: m.status,
            })),
            utilityReadings: unit.utilityReadings.map((r) => ({
              id: r.id,
              utilityType: r.utilityType,
              readingDate: r.readingDate,
              meterReading: r.meterReading?.toString() ?? null,
              amountOmr: r.amountOmr?.toString() ?? null,
            })),
          }}
        />
      </main>
    </>
  );
}
