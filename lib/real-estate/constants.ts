export const RE_PATH = "/real-estate";

export const HELD_UNIT_PROPERTY_TYPES = [
  "APARTMENT",
  "OFFICE",
  "SHOP",
  "SHOWROOM",
  "STUDIO",
  "PENTHOUSE",
] as const;

export type HeldUnitPropertyType = (typeof HELD_UNIT_PROPERTY_TYPES)[number];

export const HELD_UNIT_TO_UNIT_TYPE: Record<HeldUnitPropertyType, string> = {
  APARTMENT: "APARTMENT",
  OFFICE: "OFFICE",
  SHOP: "SHOP",
  SHOWROOM: "SHOWROOM",
  STUDIO: "STUDIO",
  PENTHOUSE: "PENTHOUSE",
};

export function isHeldUnitPropertyType(type: string): type is HeldUnitPropertyType {
  return (HELD_UNIT_PROPERTY_TYPES as readonly string[]).includes(type);
}

export const DEFAULT_NOTICE_PERIOD_DAYS = 90;
export const DEFAULT_WATER_PROVIDER = "PAEW";
export const ELECTRICITY_PROVIDERS = ["MEDC", "OETC"] as const;

export const OMAN_GOVERNORATES = [
  "Muscat",
  "Dhofar",
  "Al Batinah North",
  "Al Batinah South",
  "Ash Sharqiyah North",
  "Ash Sharqiyah South",
  "Ad Dakhiliyah",
  "Ad Dhahirah",
  "Al Buraimi",
  "Al Wusta",
  "Musandam",
] as const;
