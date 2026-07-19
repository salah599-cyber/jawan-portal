export function formatManualOverlapWarning(symbols: string[]): string {
  if (symbols.length === 0) return "";

  const listed =
    symbols.length <= 5
      ? symbols.join(", ")
      : `${symbols.slice(0, 5).join(", ")} and ${symbols.length - 5} more`;

  const noun = symbols.length === 1 ? "symbol already exists" : "symbols already exist";

  return `${symbols.length} ${noun} as manual entries (${listed}). Import will not replace these — you may end up with duplicate rows.`;
}
