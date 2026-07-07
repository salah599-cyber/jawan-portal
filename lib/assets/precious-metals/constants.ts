import type {
  PreciousMetalPriceBasis,
  PreciousMetalType,
  PreciousMetalUnit,
} from "@/lib/generated/prisma/client";

export const PRECIOUS_METAL_LABELS: Record<PreciousMetalType, string> = {
  GOLD: "Gold",
  SILVER: "Silver",
};

export const PRECIOUS_METAL_UNIT_LABELS: Record<PreciousMetalUnit, string> = {
  GRAM: "Gram",
  TOLA_10: "10 Tola bar",
  KG: "Kilogram",
  OZ: "Troy ounce",
};

export const PRECIOUS_METAL_PRICE_BASIS_LABELS: Record<PreciousMetalPriceBasis, string> = {
  OMR_BUY: "OMR buy (Muscat Bullion board)",
  OMR_SELL: "OMR sell (Muscat Bullion board)",
  USD_SPOT_OZ: "USD spot per troy ounce",
};

export const GOLD_UNITS: PreciousMetalUnit[] = ["GRAM", "TOLA_10", "OZ"];
export const SILVER_UNITS: PreciousMetalUnit[] = ["GRAM", "KG", "OZ"];

export const PRICE_SOURCE_MUSCAT_BULLION = "GOLDAPI+MUSCAT_BULLION";

export function unitsForMetal(metal: PreciousMetalType): PreciousMetalUnit[] {
  return metal === "GOLD" ? GOLD_UNITS : SILVER_UNITS;
}

export function defaultUnitForMetal(metal: PreciousMetalType): PreciousMetalUnit {
  return metal === "GOLD" ? "GRAM" : "GRAM";
}

export function isPreciousMetalCategorySelection(categorySelection: string) {
  return categorySelection === "category:PRECIOUS_METALS";
}
