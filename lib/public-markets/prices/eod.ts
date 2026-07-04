export type ExchangeEodQuote = {
  symbol: string;
  closePrice: number;
  currency: string;
};

export function selectExchangeEodQuotes(
  allQuotes: Map<string, ExchangeEodQuote>,
  symbols: string[],
): Map<string, ExchangeEodQuote> {
  const uniqueSymbols = [
    ...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)),
  ];

  const selected = new Map<string, ExchangeEodQuote>();
  for (const symbol of uniqueSymbols) {
    const quote = allQuotes.get(symbol);
    if (quote) {
      selected.set(symbol, quote);
    }
  }

  return selected;
}
