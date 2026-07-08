/**
 * Newton-Raphson XIRR for irregular cash flows.
 * Amounts: negative = outflow (capital calls), positive = inflow (distributions + terminal NAV).
 */
export function calculateXirr(
  flows: { date: Date; amount: number }[],
  guess = 0.1,
): number | null {
  if (flows.length < 2) return null;

  const hasPositive = flows.some((f) => f.amount > 0);
  const hasNegative = flows.some((f) => f.amount < 0);
  if (!hasPositive || !hasNegative) return null;

  const baseDate = flows[0].date.getTime();
  const yearFraction = (date: Date) => (date.getTime() - baseDate) / (365.25 * 24 * 60 * 60 * 1000);

  const npv = (rate: number) =>
    flows.reduce((sum, flow) => {
      const t = yearFraction(flow.date);
      return sum + flow.amount / Math.pow(1 + rate, t);
    }, 0);

  const dNpv = (rate: number) =>
    flows.reduce((sum, flow) => {
      const t = yearFraction(flow.date);
      if (t === 0) return sum;
      return sum - (t * flow.amount) / Math.pow(1 + rate, t + 1);
    }, 0);

  let rate = guess;
  for (let i = 0; i < 50; i++) {
    const value = npv(rate);
    const derivative = dNpv(rate);
    if (Math.abs(derivative) < 1e-10) break;
    const next = rate - value / derivative;
    if (!Number.isFinite(next)) break;
    if (Math.abs(next - rate) < 1e-7) {
      return next;
    }
    rate = next;
  }

  const finalNpv = npv(rate);
  return Math.abs(finalNpv) < 1e-4 && Number.isFinite(rate) ? rate : null;
}

export function formatMultiple(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(value)) return null;
  return `${value.toFixed(2)}x`;
}

export function formatIrr(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(value)) return null;
  return `${(value * 100).toFixed(1)}%`;
}
