"use client";

import { cn } from "@/lib/utils";

type PortfolioManagementFieldProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  className?: string;
};

const OPTIONS = [
  {
    value: true,
    title: "Managed portfolio",
    description: "Active holdings you update from brokerage statements",
  },
  {
    value: false,
    title: "Reference portfolio",
    description: "External or non-managed statements tracked separately",
  },
] as const;

export function PortfolioManagementField({
  value,
  onChange,
  className,
}: PortfolioManagementFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium">Portfolio type</p>
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
