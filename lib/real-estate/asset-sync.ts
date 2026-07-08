import { db } from "@/lib/db";
import { recordAssetValuation } from "@/lib/portfolio/valuations";
import { propertyStatusToAssetStatus } from "@/lib/real-estate/metrics";
import { toNumber } from "@/lib/real-estate/helpers";
import { RE_PATH } from "@/lib/real-estate/constants";

export async function syncRePropertyAsset(propertyId: string) {
  const property = await db.reProperty.findUnique({
    where: { id: propertyId },
    include: {
      valuations: { orderBy: { valuationDate: "desc" }, take: 1 },
    },
  });

  if (!property) return;

  const location = [property.area, property.wilayat, property.governorate]
    .filter(Boolean)
    .join(", ");

  if (!property.assetId) {
    const currentValue = property.currentValuationOmr?.toString();
    const asset = await db.asset.create({
      data: {
        name: property.name,
        category: "REAL_ESTATE",
        status: propertyStatusToAssetStatus(property.status),
        entityId: property.entityId,
        acquisitionDate: property.purchaseDate,
        acquisitionCost: property.purchasePriceOmr?.toString(),
        currentValue,
        currency: "OMR",
        realEstate: {
          create: {
            titleDeed: null,
            plotNumber: property.plotNumber,
            bua: property.builtUpAreaSqm?.toString(),
            location: location || property.streetAddress,
            isEmptyLand: property.propertyType === "LAND",
          },
        },
      },
    });
    await db.reProperty.update({
      where: { id: propertyId },
      data: { assetId: asset.id },
    });

    const value = toNumber(property.currentValuationOmr);
    if (value > 0) {
      await recordAssetValuation({
        assetId: asset.id,
        value,
        currency: "OMR",
        valuedAt: property.lastValuationDate ?? property.purchaseDate ?? new Date(),
      });
    }
    return;
  }

  const currentValue =
    property.currentValuationOmr?.toString() ??
    property.valuations[0]?.valuationOmr?.toString();
  const valuedAt = property.lastValuationDate ?? property.valuations[0]?.valuationDate ?? new Date();

  await db.asset.update({
    where: { id: property.assetId },
    data: {
      name: property.name,
      status: propertyStatusToAssetStatus(property.status),
      acquisitionDate: property.purchaseDate,
      acquisitionCost: property.purchasePriceOmr?.toString(),
      currentValue,
      valueUpdatedAt: valuedAt,
      exitedAt: property.status === "SOLD" ? new Date() : null,
      realEstate: {
        upsert: {
          create: {
            plotNumber: property.plotNumber,
            bua: property.builtUpAreaSqm?.toString(),
            location: location || property.streetAddress,
            isEmptyLand: property.propertyType === "LAND",
          },
          update: {
            plotNumber: property.plotNumber,
            bua: property.builtUpAreaSqm?.toString(),
            location: location || property.streetAddress,
            isEmptyLand: property.propertyType === "LAND",
          },
        },
      },
    },
  });

  const value = currentValue ? toNumber(currentValue) : 0;
  if (value > 0) {
    await recordAssetValuation({
      assetId: property.assetId,
      value,
      currency: "OMR",
      valuedAt,
    });
  }
}

export async function updatePropertyUnitCount(propertyId: string) {
  const count = await db.reUnit.count({ where: { propertyId } });
  await db.reProperty.update({
    where: { id: propertyId },
    data: { numUnits: count },
  });
}

export { RE_PATH };
