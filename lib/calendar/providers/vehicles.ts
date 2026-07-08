import { db } from "@/lib/db";
import { buildSystemItem } from "@/lib/calendar/helpers";
import type { CalendarItem } from "@/lib/calendar/types";
import { addDays } from "@/lib/calendar/status";
import { canAccess } from "@/lib/permissions/access";
import { carEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";

export async function getVehicleCalendarItems(ctx: UserContext): Promise<CalendarItem[]> {
  if (!canAccess(ctx, "CARS")) return [];

  const now = new Date();
  const horizon = addDays(now, 30);

  const vehicles = await db.vehicle.findMany({
    where: carEntityFilter(ctx),
    select: {
      id: true,
      name: true,
      plateNumber: true,
      plateCode: true,
      registrationExpiryDate: true,
      insuranceExpiryDate: true,
      entityId: true,
      entity: { select: { name: true } },
    },
    take: 50,
  });

  const items: CalendarItem[] = [];

  for (const vehicle of vehicles) {
    const plate = [vehicle.plateCode, vehicle.plateNumber].filter(Boolean).join(" ");
    for (const [date, label] of [
      [vehicle.registrationExpiryDate, "Registration expiry"],
      [vehicle.insuranceExpiryDate, "Insurance expiry"],
    ] as const) {
      if (!date || date > horizon) continue;
      items.push(
        buildSystemItem({
          id: `system:vehicle:${vehicle.id}:${label}`,
          kind: "VEHICLE_EXPIRY",
          module: "CARS",
          title: vehicle.name,
          subtitle: label + (plate ? ` · ${plate}` : ""),
          date,
          href: `/cars/${vehicle.id}`,
          entityId: vehicle.entityId,
          entityName: vehicle.entity?.name,
        }),
      );
    }
  }

  return items;
}
