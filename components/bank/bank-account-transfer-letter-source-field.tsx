"use client";

import { cn } from "@/lib/utils";

type BankAccountTransferLetterSourceFieldProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  className?: string;
};

export function BankAccountTransferLetterSourceField({
  value,
  onChange,
  className,
}: BankAccountTransferLetterSourceFieldProps) {
  return (
    <div className={cn("flex items-start gap-3 md:col-span-2", className)}>
      <input
        type="checkbox"
        id="includeInTransferLetterSource"
        checked={value}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 size-4 rounded border border-input"
      />
      <div className="space-y-1">
        <label htmlFor="includeInTransferLetterSource" className="text-sm font-medium">
          Include in transfer letter source accounts
        </label>
        <p className="text-xs text-muted-foreground">
          When enabled, this account appears in the source account dropdown on transfer letters.
          All accounts remain available as beneficiaries.
        </p>
      </div>
    </div>
  );
}
