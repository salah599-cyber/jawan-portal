"use client";

import type { ManagedPortfolioRow } from "@/lib/data/managed-portfolios";
import { PRIVATE_PORTFOLIO_SLUG } from "@/lib/public-markets/constants";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ManagedPortfolioSelect({
  portfolios,
  value,
  onValueChange,
  allowPrivate = true,
  required = false,
  label = "Portfolio",
  placeholder = "Select portfolio",
}: {
  portfolios: ManagedPortfolioRow[];
  value: string;
  onValueChange: (value: string) => void;
  allowPrivate?: boolean;
  required?: boolean;
  label?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValueChange} required={required}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allowPrivate ? (
            <SelectItem value={PRIVATE_PORTFOLIO_SLUG}>Private holdings</SelectItem>
          ) : null}
          {portfolios.map((portfolio) => (
            <SelectItem key={portfolio.id} value={portfolio.id}>
              {portfolio.managerName} — {portfolio.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
