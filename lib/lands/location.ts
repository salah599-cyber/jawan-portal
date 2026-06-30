import { LAND_DOCUMENT_TYPE_LABELS } from "@/lib/labels";

export type LandLocationLike = {
  locationType?: string | null;
  country?: string | null;
  governorate?: string | null;
  wilayat?: string | null;
  region?: string | null;
  city?: string | null;
  village?: string | null;
};

export function isInternationalLand(land: LandLocationLike): boolean {
  return land.locationType === "INTERNATIONAL";
}

export function formatLandLocation(land: LandLocationLike): string {
  if (isInternationalLand(land)) {
    return [land.village, land.city, land.region, land.country].filter(Boolean).join(", ");
  }
  const omanParts = [land.village, land.wilayat, land.governorate].filter(Boolean).join(", ");
  return omanParts || "Oman";
}

export function getLandDocumentTypeLabels(international: boolean): Record<string, string> {
  if (international) {
    return {
      KROOKI: "Survey / Plot Plan",
      MULKIA: "Title Deed",
      OTHER: "Other",
    };
  }
  return LAND_DOCUMENT_TYPE_LABELS;
}

export function getLandReferenceFieldLabels(international: boolean) {
  if (international) {
    return {
      krooki: "Survey / Plot Reference",
      mulkia: "Title Deed / Registration No.",
    };
  }
  return {
    krooki: "Krooki Number",
    mulkia: "Mulkia Number",
  };
}

export function getLandReferenceColumnLabel(international: boolean): string {
  return international ? "Title / Survey Ref." : "Krooki / Mulkia";
}
