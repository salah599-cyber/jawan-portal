"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney, formatOmr } from "@/lib/format";
import { convertFromOmrSync } from "@/lib/fx/convert";
import {
  DEFAULT_DISPLAY_CURRENCY,
  DISPLAY_CURRENCIES,
  DISPLAY_CURRENCY_STORAGE_KEY,
  type DisplayCurrency,
} from "@/lib/fx/constants";

type FxRatesResponse = {
  base: string;
  rates: Record<string, number>;
  updatedAt: string | null;
  source: string;
};

export function DashboardWealthCards({
  portfolioTotalOmr,
  netWorthTotalOmr,
  hasPortfolio,
  hasLiabilities,
}: {
  portfolioTotalOmr: number;
  netWorthTotalOmr: number;
  hasPortfolio: boolean;
  hasLiabilities: boolean;
}) {
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>(DEFAULT_DISPLAY_CURRENCY);
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState<string | null>(null);
  const [ratesLoading, setRatesLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(DISPLAY_CURRENCY_STORAGE_KEY);
    if (stored && DISPLAY_CURRENCIES.includes(stored as DisplayCurrency)) {
      setDisplayCurrency(stored as DisplayCurrency);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRates() {
      setRatesLoading(true);
      try {
        const response = await fetch("/api/fx/rates");
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as FxRatesResponse;
        if (!cancelled) {
          setRates(payload.rates);
          setRatesUpdatedAt(payload.updatedAt);
        }
      } catch {
        // Keep OMR-only display when rates are unavailable.
      } finally {
        if (!cancelled) {
          setRatesLoading(false);
        }
      }
    }

    void loadRates();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleCurrencyChange(value: string) {
    const currency = value as DisplayCurrency;
    setDisplayCurrency(currency);
    localStorage.setItem(DISPLAY_CURRENCY_STORAGE_KEY, currency);
  }

  const portfolioConverted = rates
    ? convertFromOmrSync(portfolioTotalOmr, displayCurrency, rates)
    : null;
  const netWorthConverted = rates
    ? convertFromOmrSync(netWorthTotalOmr, displayCurrency, rates)
    : null;

  const ratesCaption = ratesUpdatedAt
    ? `Rates via Yahoo Finance · updated ${new Date(ratesUpdatedAt).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : ratesLoading
      ? "Loading exchange rates…"
      : "Rates via Yahoo Finance";

  return (
    <div className="md:col-span-2 space-y-2">
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground">Display also in</span>
        <Select value={displayCurrency} onValueChange={handleCurrencyChange}>
          <SelectTrigger size="sm" aria-label="Display currency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DISPLAY_CURRENCIES.map((currency) => (
              <SelectItem key={currency} value={currency}>
                {currency}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="text-right text-xs text-muted-foreground">{ratesCaption}</p>

      <div className="grid gap-4 md:grid-cols-2">
        <WealthMetricCard
          label="Portfolio Value"
          omrValue={formatOmr(portfolioTotalOmr)}
          convertedValue={
            portfolioConverted != null ? formatMoney(portfolioConverted, displayCurrency) : null
          }
          detail={
            hasPortfolio
              ? "Active & monitored assets, converted to OMR"
              : "Add assets to track portfolio value"
          }
        />
        <WealthMetricCard
          label="Net Worth"
          omrValue={formatOmr(netWorthTotalOmr)}
          convertedValue={
            netWorthConverted != null ? formatMoney(netWorthConverted, displayCurrency) : null
          }
          detail={
            hasLiabilities
              ? "Portfolio minus liabilities, converted to OMR"
              : hasPortfolio
                ? "No active liabilities recorded"
                : "Calculated from assets and liabilities"
          }
        />
      </div>
    </div>
  );
}

function WealthMetricCard({
  label,
  omrValue,
  convertedValue,
  detail,
}: {
  label: string;
  omrValue: string;
  convertedValue: string | null;
  detail: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{omrValue}</CardTitle>
        {convertedValue ? (
          <p className="text-sm font-medium text-muted-foreground">≈ {convertedValue}</p>
        ) : null}
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
