/** Currencies available in the dashboard display dropdown (OMR is always primary). */
export const DISPLAY_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "AED",
  "SAR",
  "KWD",
  "BHD",
  "QAR",
  "HKD",
  "CNY",
  "INR",
] as const;

export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

export const DEFAULT_DISPLAY_CURRENCY: DisplayCurrency = "USD";

export const DISPLAY_CURRENCY_STORAGE_KEY = "dashboard-display-currency";

export const FX_STALE_AFTER_MS = 6 * 60 * 60 * 1000;

/** Yahoo chart symbols that return OMR per 1 unit of the currency directly. */
export const YAHOO_DIRECT_OMR_PAIRS: Partial<Record<DisplayCurrency, string>> = {
  USD: "USDOMR=X",
  EUR: "EUROMR=X",
  GBP: "GBPOMR=X",
  AED: "AEDOMR=X",
  BHD: "BHDOMR=X",
  QAR: "QAROMR=X",
  HKD: "HKDOMR=X",
  INR: "INROMR=X",
};

/**
 * Yahoo USD cross pairs: rate is units of currency per 1 USD.
 * OMR per unit = USDOMR / crossRate.
 */
export const YAHOO_USD_CROSS_PAIRS: Partial<Record<DisplayCurrency, string>> = {
  SAR: "USDSAR=X",
  KWD: "USDKWD=X",
  CNY: "USDCNY=X",
};

export const YAHOO_USD_OMR_PAIR = "USDOMR=X";
