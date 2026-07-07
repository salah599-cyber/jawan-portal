"use client";

import type {
  PreciousMetalPriceBasis,
  PreciousMetalType,
  PreciousMetalUnit,
} from "@/lib/generated/prisma/client";
import {
  PRECIOUS_METAL_LABELS,
  PRECIOUS_METAL_PRICE_BASIS_LABELS,
  PRECIOUS_METAL_UNIT_LABELS,
  defaultUnitForMetal,
  unitsForMetal,
} from "@/lib/assets/precious-metals/constants";
import { parseAssetCategorySelection } from "@/lib/assets/category-display";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type PreciousMetalFormValue = {
  metal: PreciousMetalType;
  unit: PreciousMetalUnit;
  quantity: string;
  priceBasis: PreciousMetalPriceBasis;
};

export const EMPTY_PRECIOUS_METAL_FORM: PreciousMetalFormValue = {
  metal: "GOLD",
  unit: "GRAM",
  quantity: "",
  priceBasis: "OMR_BUY",
};

export function isPreciousMetalsSelection(categorySelection: string) {
  const parsed = parseAssetCategorySelection(categorySelection);
  return parsed.kind === "built-in" && parsed.category === "PRECIOUS_METALS";
}

export function PreciousMetalFields({
  value,
  onChange,
}: {
  value: PreciousMetalFormValue;
  onChange: (value: PreciousMetalFormValue) => void;
}) {
  const unitOptions = unitsForMetal(value.metal);

  return (
    <div className="grid gap-4 md:grid-cols-2 md:col-span-2 rounded-lg border p-4">
      <div className="md:col-span-2">
        <p className="text-sm font-medium">Precious metal details</p>
        <p className="text-xs text-muted-foreground">
          Values refresh from GoldAPI.io using Muscat Bullion OMR board formulas.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Metal</Label>
        <Select
          value={value.metal}
          onValueChange={(metal) =>
            onChange({
              ...value,
              metal: metal as PreciousMetalType,
              unit: defaultUnitForMetal(metal as PreciousMetalType),
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PRECIOUS_METAL_LABELS).map(([metal, label]) => (
              <SelectItem key={metal} value={metal}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Unit</Label>
        <Select
          value={value.unit}
          onValueChange={(unit) => onChange({ ...value, unit: unit as PreciousMetalUnit })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {unitOptions.map((unit) => (
              <SelectItem key={unit} value={unit}>
                {PRECIOUS_METAL_UNIT_LABELS[unit]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="preciousMetalQuantity">Quantity</Label>
        <Input
          id="preciousMetalQuantity"
          type="number"
          min="0"
          step="any"
          required
          value={value.quantity}
          onChange={(e) => onChange({ ...value, quantity: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Price basis</Label>
        <Select
          value={value.priceBasis}
          onValueChange={(priceBasis) =>
            onChange({ ...value, priceBasis: priceBasis as PreciousMetalPriceBasis })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PRECIOUS_METAL_PRICE_BASIS_LABELS).map(([basis, label]) => (
              <SelectItem key={basis} value={basis}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
