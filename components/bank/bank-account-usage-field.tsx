"use client";

import { cn } from "@/lib/utils";

type BankAccountUsageFieldProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  className?: string;
};

const OPTIONS = [
  {
    value: false,
    title: "Reference / personal",
    description: "Store bank details for cheques and records only",
  },
  {
    value: true,
    title: "Include in cash position",
    description: "Balance counts toward cash position and net worth",
  },
] as const;

export function BankAccountUsageField({ value, onChange, className }: BankAccountUsageFieldProps) {
  return (
    <div className={cn("space-y-2 md:col-span-2", className)}>
      <p className="text-sm font-medium">Account usage</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.title}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-lg border p-4 text-left transition-colors",
                selected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:bg-muted/50",
              )}
            >
              <p className="text-sm font-medium">{option.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
