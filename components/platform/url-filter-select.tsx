"use client";

import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type UrlFilterOption = {
  value: string;
  label: string;
};

export type SearchParamMap = Record<string, string | undefined>;

function buildUrl(
  pathname: string,
  currentParams: SearchParamMap,
  preserveParams: string[],
  paramKey: string,
  nextValue: string,
  omitWhenValue?: string,
) {
  const params = new URLSearchParams();

  for (const key of preserveParams) {
    const existing = currentParams[key];
    if (existing) params.set(key, existing);
  }

  const shouldOmit = omitWhenValue != null && nextValue === omitWhenValue;
  if (!shouldOmit) {
    params.set(paramKey, nextValue);
  }

  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function UrlFilterSelect({
  label,
  paramKey,
  value,
  options,
  pathname,
  currentParams,
  preserveParams = [],
  omitWhenValue,
  className,
  triggerClassName,
}: {
  label: string;
  paramKey: string;
  value: string;
  options: UrlFilterOption[];
  pathname: string;
  currentParams: SearchParamMap;
  preserveParams?: string[];
  omitWhenValue?: string;
  className?: string;
  triggerClassName?: string;
}) {
  const router = useRouter();

  function handleChange(nextValue: string) {
    router.push(
      buildUrl(pathname, currentParams, preserveParams, paramKey, nextValue, omitWhenValue),
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger size="sm" className={cn("min-w-[10rem]", triggerClassName)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
