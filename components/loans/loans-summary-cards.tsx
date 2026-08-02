"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime, formatMoney, formatOmr } from "@/lib/format";
import { convertFromOmrSync } from "@/lib/fx/convert";
import {
  DEFAULT_DISPLAY_CURRENCY,
  DISPLAY_CURRENCIES,
  DISPLAY_CURRENCY_STORAGE_KEY,
  type DisplayCurrency,
} from "@/lib/fx/constants";
import type { LoansSummary } from "@/lib/data/loans-summary";
import { LoansCurrencyBreakdown } from "@/components/loans/loans-currency-breakdown";

type FxRatesResponse = {
  base: string;
  rates: Record<string, number>;
  updatedAt: string | null;
  source: string;
};

function getStoredDisplayCurrency(): DisplayCurrency {
  if (typeof window === "undefined") return DEFAULT_DISPLAY_CURRENCY;
  const stored = localStorage.getItem(DISPLAY_CURRENCY_STORAGE_KEY);
  return stored && DISPLAY_CURRENCIES.includes(stored as DisplayCurrency)
    ? (stored as DisplayCurrency)
    : DEFAULT_DISPLAY_CURRENCY;
}

function LoansMetricCard({
  label,
  value,
  secondaryLine,
  detail,
}: {
  label: string;
  value: string;
  secondaryLine?: string | null;
  detail: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="min-h-5 text-sm font-medium text-muted-foreground">
          {secondaryLine ?? "\u00A0"}
        </p>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function LoansSummaryCards({ summary }: { summary: LoansSummary }) {
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>(getStoredDisplayCurrency);
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState<string | null>(null);
  const [ratesLoading, setRatesLoading] = useState(true);

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

  function converted(amountOmr: number): string | null {
    if (!rates) return null;
    const amount = convertFromOmrSync(amountOmr, displayCurrency, rates);
    return `≈ ${formatMoney(amount, displayCurrency)}`;
  }

  const ratesCaption = ratesUpdatedAt
    ? `Rates via Yahoo Finance · updated ${formatDateTime(ratesUpdatedAt)}`
    : ratesLoading
      ? "Loading exchange rates…"
      : "Rates via Yahoo Finance";

  const hasActiveLoans = summary.activeCount > 0;
  const hasLoans = summary.byCurrency.length > 0;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <LoansMetricCard
          label="Active Loans"
          value={summary.activeCount.toString()}
          detail="Currently active facilities"
        />
        <LoansMetricCard
          label="Outstanding"
          value={hasActiveLoans ? formatOmr(summary.totalOutstandingOmr) : "—"}
          secondaryLine={hasActiveLoans ? converted(summary.totalOutstandingOmr) : null}
          detail="Active loan balances, converted to OMR"
        />
        <LoansMetricCard
          label="Interest Paid"
          value={hasLoans ? formatOmr(summary.totalInterestPaidOmr) : "—"}
          secondaryLine={hasLoans ? converted(summary.totalInterestPaidOmr) : null}
          detail="Across all recorded repayments"
        />
        <LoansMetricCard
          label="Next Period Interest"
          value={hasActiveLoans ? formatOmr(summary.totalPeriodInterestOmr) : "—"}
          secondaryLine={hasActiveLoans ? converted(summary.totalPeriodInterestOmr) : null}
          detail="Estimated from active loan rates"
        />
      </div>

      {summary.byCurrency.length > 0 ? (
        <LoansCurrencyBreakdown byCurrency={summary.byCurrency} />
      ) : null}
    </div>
  );
}
