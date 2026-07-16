"use client";

import { TRANSFER_CURRENCIES } from "@/lib/transfer/constants";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CurrencySelect({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
}) {
  const options = TRANSFER_CURRENCIES.includes(value as (typeof TRANSFER_CURRENCIES)[number])
    ? TRANSFER_CURRENCIES
    : ([value, ...TRANSFER_CURRENCIES] as string[]);

  return (
    <div className="space-y-2">
      <Label>Currency</Label>
      <Select value={value || "OMR"} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select currency" />
        </SelectTrigger>
        <SelectContent>
          {options.map((currency) => (
            <SelectItem key={currency} value={currency}>
              {currency}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input type="hidden" name="currency" value={value || "OMR"} />
    </div>
  );
}
