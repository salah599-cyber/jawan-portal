import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AssetAcquisitionFields({
  acquisitionDateDefault,
  acquisitionCostDefault,
  currentValueDefault,
}: {
  acquisitionDateDefault?: string;
  acquisitionCostDefault?: string;
  currentValueDefault?: string;
}) {
  return (
    <>
      <div className="space-y-1 md:col-span-2">
        <p className="text-sm font-semibold">Acquisition</p>
        <p className="text-xs text-muted-foreground">
          Record when the asset was acquired and the purchase details.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="acquisitionDate">Acquisition Date</Label>
        <Input
          id="acquisitionDate"
          name="acquisitionDate"
          type="date"
          defaultValue={acquisitionDateDefault}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="acquisitionCost">Acquisition Cost</Label>
        <Input
          id="acquisitionCost"
          name="acquisitionCost"
          type="number"
          step="0.01"
          min="0"
          defaultValue={acquisitionCostDefault}
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="currentValue">Current Value</Label>
        <Input
          id="currentValue"
          name="currentValue"
          type="number"
          step="0.01"
          min="0"
          defaultValue={currentValueDefault}
        />
      </div>
    </>
  );
}
