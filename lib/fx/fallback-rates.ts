/** Fallback FX rates to OMR when no FxRate row exists (1 unit of fromCurrency = rate OMR). */
export const FALLBACK_RATES_TO_OMR: Record<string, number> = {
  OMR: 1,
  USD: 0.385,
  EUR: 0.42,
  GBP: 0.49,
  AED: 0.105,
  SAR: 0.103,
  KWD: 1.25,
  BHD: 1.02,
  QAR: 0.106,
  HKD: 0.049,
  CNY: 0.053,
  INR: 0.0046,
};
