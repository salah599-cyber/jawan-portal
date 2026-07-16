export function formatTransferLetterSerialNumber(serialNumber: number): string {
  return `TL-${String(serialNumber).padStart(5, "0")}`;
}
