"use client";

import { useMemo } from "react";
import { OMAN_GOVERNORATES, getWilayatsForGovernorate } from "@/lib/data/oman-locations";
import { LAND_COUNTRY_OPTIONS, LAND_COUNTRY_OTHER } from "@/lib/data/countries";
import { LAND_LOCATION_TYPE_LABELS } from "@/lib/labels";
import { getLandReferenceFieldLabels } from "@/lib/lands/location";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type LandLocationValues = {
  locationType: "OMAN" | "INTERNATIONAL";
  governorate: string;
  wilayat: string;
  country: string;
  countryOther: string;
  region: string;
  city: string;
  village: string;
};

type LandLocationFieldsProps = {
  values: LandLocationValues;
  onChange: (next: LandLocationValues) => void;
  villageDefaultValue?: string;
  referenceDefaults?: { krooki?: string; mulkia?: string };
};

export function LandLocationFields({
  values,
  onChange,
  villageDefaultValue,
  referenceDefaults,
}: LandLocationFieldsProps) {
  const isInternational = values.locationType === "INTERNATIONAL";
  const wilayats = useMemo(
    () => getWilayatsForGovernorate(values.governorate),
    [values.governorate],
  );
  const refLabels = getLandReferenceFieldLabels(isInternational);
  const countryIsOther =
    isInternational &&
    values.country !== "" &&
    !LAND_COUNTRY_OPTIONS.includes(values.country as (typeof LAND_COUNTRY_OPTIONS)[number]);

  function setLocationType(locationType: "OMAN" | "INTERNATIONAL") {
    onChange({ ...values, locationType });
  }

  function handleGovernorateChange(governorate: string) {
    const nextWilayats = getWilayatsForGovernorate(governorate);
    onChange({
      ...values,
      governorate,
      wilayat: nextWilayats.includes(values.wilayat) ? values.wilayat : nextWilayats[0] ?? "",
    });
  }

  return (
    <>
      <div className="space-y-2 md:col-span-2">
        <Label>Location</Label>
        <div className="flex flex-wrap gap-4">
          {(["OMAN", "INTERNATIONAL"] as const).map((type) => (
            <label key={type} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="locationTypeChoice"
                checked={values.locationType === type}
                onChange={() => setLocationType(type)}
                className="size-4"
              />
              {LAND_LOCATION_TYPE_LABELS[type]}
            </label>
          ))}
        </div>
        <input type="hidden" name="locationType" value={values.locationType} />
      </div>

      {isInternational ? (
        <>
          <div className="space-y-2">
            <Label>Country</Label>
            <Select
              value={countryIsOther ? LAND_COUNTRY_OTHER : values.country || undefined}
              onValueChange={(country) =>
                onChange({
                  ...values,
                  country: country === LAND_COUNTRY_OTHER ? "" : country,
                  countryOther: country === LAND_COUNTRY_OTHER ? values.countryOther : "",
                })
              }
            >
              <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
              <SelectContent>
                {LAND_COUNTRY_OPTIONS.map((country) => (
                  <SelectItem key={country} value={country}>{country}</SelectItem>
                ))}
                <SelectItem value={LAND_COUNTRY_OTHER}>Other</SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" name="country" value={countryIsOther ? LAND_COUNTRY_OTHER : values.country} />
          </div>
          {countryIsOther || values.country === "" ? (
            <div className="space-y-2">
              <Label htmlFor="countryOther">Country name</Label>
              <Input
                id="countryOther"
                name="countryOther"
                required={isInternational}
                value={countryIsOther ? values.country : values.countryOther}
                onChange={(e) =>
                  onChange({
                    ...values,
                    country: e.target.value,
                    countryOther: e.target.value,
                  })
                }
                placeholder="Enter country name"
              />
            </div>
          ) : (
            <input type="hidden" name="countryOther" value="" />
          )}
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              name="city"
              required={isInternational}
              value={values.city}
              onChange={(e) => onChange({ ...values, city: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="region">State / Region (optional)</Label>
            <Input
              id="region"
              name="region"
              value={values.region}
              onChange={(e) => onChange({ ...values, region: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="village">Area / District (optional)</Label>
            <Input
              id="village"
              name="village"
              value={values.village}
              onChange={(e) => onChange({ ...values, village: e.target.value })}
            />
          </div>
          <input type="hidden" name="governorate" value="" />
          <input type="hidden" name="wilayat" value="" />
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label>Governorate</Label>
            <Select value={values.governorate} onValueChange={handleGovernorateChange}>
              <SelectTrigger><SelectValue placeholder="Select governorate" /></SelectTrigger>
              <SelectContent>
                {OMAN_GOVERNORATES.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="governorate" value={values.governorate} />
          </div>
          <div className="space-y-2">
            <Label>Wilayat</Label>
            <Select value={values.wilayat} onValueChange={(wilayat) => onChange({ ...values, wilayat })}>
              <SelectTrigger><SelectValue placeholder="Select wilayat" /></SelectTrigger>
              <SelectContent>
                {wilayats.map((w) => (
                  <SelectItem key={w} value={w}>{w}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="wilayat" value={values.wilayat} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="village">Village / Area</Label>
            <Input id="village" name="village" defaultValue={villageDefaultValue} />
          </div>
          <input type="hidden" name="country" value="Oman" />
          <input type="hidden" name="countryOther" value="" />
          <input type="hidden" name="city" value="" />
          <input type="hidden" name="region" value="" />
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="krookiNumber">{refLabels.krooki}</Label>
        <Input id="krookiNumber" name="krookiNumber" defaultValue={referenceDefaults?.krooki ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="mulkiaNumber">{refLabels.mulkia}</Label>
        <Input id="mulkiaNumber" name="mulkiaNumber" defaultValue={referenceDefaults?.mulkia ?? ""} />
      </div>
    </>
  );
}

export function initialLandLocationValues(land?: {
  locationType?: string | null;
  country?: string | null;
  governorate?: string | null;
  wilayat?: string | null;
  region?: string | null;
  city?: string | null;
  village?: string | null;
}): LandLocationValues {
  const locationType = land?.locationType === "INTERNATIONAL" ? "INTERNATIONAL" : "OMAN";
  const country = land?.country ?? "Oman";
  const isKnownCountry = LAND_COUNTRY_OPTIONS.includes(country as (typeof LAND_COUNTRY_OPTIONS)[number]);

  return {
    locationType,
    governorate: land?.governorate ?? OMAN_GOVERNORATES[0],
    wilayat: land?.wilayat ?? getWilayatsForGovernorate(land?.governorate ?? OMAN_GOVERNORATES[0])[0] ?? "",
    country: locationType === "INTERNATIONAL" ? country : "Oman",
    countryOther: locationType === "INTERNATIONAL" && !isKnownCountry ? country : "",
    region: land?.region ?? "",
    city: land?.city ?? "",
    village: land?.village ?? "",
  };
}
