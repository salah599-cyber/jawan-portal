import { db } from "@/lib/db";
import type { ReValuationMethod } from "@/lib/generated/prisma/client";
import { sumDecimals, toNumber } from "@/lib/real-estate/helpers";
import { syncRePropertyAsset } from "@/lib/real-estate/asset-sync";

export async function syncPropertyMarketValueFromUnits(
  propertyId: string,
  options?: {
    valuationDate?: Date;
    method?: ReValuationMethod;
    recordHistory?: boolean;
  },
) {
  const units = await db.reUnit.findMany({
    where: { propertyId },
    select: { currentValuationOmr: true, lastValuationDate: true },
  });

  const valuedUnits = units.filter((unit) => toNumber(unit.currentValuationOmr) > 0);

  if (valuedUnits.length === 0) {
    await syncRePropertyAsset(propertyId);
    return;
  }

  const totalOmr = sumDecimals(valuedUnits.map((unit) => unit.currentValuationOmr));
  const unitDates = valuedUnits
    .map((unit) => unit.lastValuationDate)
    .filter((date): date is Date => date != null);
  const latestUnitDate =
    unitDates.length > 0
      ? unitDates.reduce((latest, date) => (date > latest ? date : latest))
      : undefined;
  const valuationDate = options?.valuationDate ?? latestUnitDate ?? new Date();
  const method = options?.method;

  await db.reProperty.update({
    where: { id: propertyId },
    data: {
      currentValuationOmr: totalOmr.toString(),
      lastValuationDate: valuationDate,
      ...(method ? { valuationMethod: method } : {}),
    },
  });

  if (options?.recordHistory) {
    await db.rePropertyValuation.create({
      data: {
        propertyId,
        valuationDate,
        valuationOmr: totalOmr.toString(),
        method,
      },
    });
  }

  await syncRePropertyAsset(propertyId);
}
